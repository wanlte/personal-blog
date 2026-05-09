// tests/unit/utils/database.test.js - 数据库管理模块测试
// Mock prisma client
jest.mock('../../../db/index', () => {
  const mockQueryRaw = jest.fn();
  const mockDisconnect = jest.fn();
  const mockMetricsJson = jest.fn();

  return {
    $queryRaw: mockQueryRaw,
    $disconnect: mockDisconnect,
    $metrics: {
      json: mockMetricsJson,
    },
  };
});

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const prisma = require('../../../db/index');
const database = require('../../../utils/database');

describe('database', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('poolConfig', () => {
    it('应从环境变量读取连接池大小', () => {
      expect(database.poolConfig.size).toBe(10);
    });

    it('应从环境变量读取连接超时', () => {
      expect(database.poolConfig.connectionTimeout).toBe(10000);
    });
  });

  describe('healthCheck', () => {
    it('数据库正常时应返回 healthy', async () => {
      prisma.$queryRaw.mockResolvedValueOnce(undefined);

      const result = await database.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.poolSize).toBe(10);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.connectionTimeout).toBe(10000);
    });

    it('数据库异常时应返回 unhealthy', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await database.healthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Connection refused');
      expect(result.failureCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStatus', () => {
    it('应返回当前连接状态', () => {
      const status = database.getStatus();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('poolConfig');
      expect(status).toHaveProperty('lastPing');
      expect(status).toHaveProperty('failureCount');
      expect(status).toHaveProperty('uptime');
    });
  });

  describe('getMetrics', () => {
    it('成功时应返回解析后的指标', async () => {
      prisma.$metrics.json.mockResolvedValueOnce(
        JSON.stringify({
          pool: { active: 2, idle: 8, waiting: 0, total: 10 },
          queries: { total: 150, avgDurationMs: 12 },
        })
      );

      const metrics = await database.getMetrics();
      expect(metrics.pool).toEqual({ active: 2, idle: 8, waiting: 0, total: 10 });
      expect(metrics.queries).toEqual({ total: 150, avgDuration: 12 });
    });

    it('失败时应返回 null 值', async () => {
      prisma.$metrics.json.mockRejectedValueOnce(new Error('metrics unavailable'));

      const metrics = await database.getMetrics();
      expect(metrics.pool).toBeNull();
      expect(metrics.queries).toBeNull();
    });
  });

  describe('withRetry', () => {
    it('操作成功时直接返回结果', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await database.withRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('非连接错误应直接抛出', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Validation error'));
      await expect(database.withRetry(fn)).rejects.toThrow('Validation error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('连接错误应自动重试', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('connection terminated'))
        .mockRejectedValueOnce(new Error('connection timeout'))
        .mockResolvedValue('recovered');

      const result = await database.withRetry(fn, { baseDelay: 10 });
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('Prisma P1001 错误应重试', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('connection lost'), { code: 'P1001' }))
        .mockResolvedValue('ok');

      const result = await database.withRetry(fn, { baseDelay: 10 });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('重试耗尽仍失败应抛出', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('connection timeout'));
      await expect(database.withRetry(fn, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow(
        'connection timeout'
      );
      expect(fn).toHaveBeenCalledTimes(3); // init + 2 retries
    });
  });

  describe('connect', () => {
    it('连接成功应设置状态', async () => {
      prisma.$queryRaw.mockResolvedValueOnce(undefined);
      await database.connect();
      const status = database.getStatus();
      expect(status.connected).toBe(true);
    });

    it('连接失败不应抛出', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('no database'));
      await expect(database.connect()).resolves.toBeUndefined();
      const status = database.getStatus();
      expect(status.connected).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('应断开 Prisma 连接', async () => {
      await database.disconnect();
      expect(prisma.$disconnect).toHaveBeenCalled();
    });
  });
});
