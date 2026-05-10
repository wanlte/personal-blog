// utils/database.js - 数据库管理模块
// 提供连接池监控、健康检查、自动重连功能

const prisma = require('../db/index');
const logger = require('./logger');

// ============ 连接池配置 ============
const config = require('../config');
const poolConfig = {
  size: config.database.poolSize,
  connectionTimeout: config.database.connectionTimeout,
};

// ============ 连接状态 ============
let isConnected = false;
let lastPingTime = null;
let failureCount = 0;
const MAX_FAILURES = 5;

// ============ 健康检查 ============
async function healthCheck() {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    isConnected = true;
    lastPingTime = new Date().toISOString();
    failureCount = 0;

    return {
      status: 'healthy',
      latency,
      poolSize: poolConfig.size,
      connectionTimeout: poolConfig.connectionTimeout,
      lastPing: lastPingTime,
    };
  } catch (err) {
    isConnected = false;
    failureCount += 1;

    logger.error('数据库健康检查失败', { error: err.message, failureCount });

    return {
      status: 'unhealthy',
      error: err.message,
      failureCount,
      poolSize: poolConfig.size,
      lastPing: lastPingTime,
    };
  }
}

// ============ 连接状态监控 ============
function getStatus() {
  return {
    connected: isConnected,
    poolConfig,
    lastPing: lastPingTime,
    failureCount,
    uptime: process.uptime(),
  };
}

// 获取 Prisma 引擎指标（Prisma 6.x 支持）
async function getMetrics() {
  try {
    // Prisma 6.x metrics 返回 JSON 字符串
    const raw = await prisma.$metrics.json();
    const metrics = JSON.parse(raw);

    return {
      pool: {
        active: metrics.pool?.active ?? null,
        idle: metrics.pool?.idle ?? null,
        waiting: metrics.pool?.waiting ?? null,
        total: metrics.pool?.total ?? null,
      },
      queries: {
        total: metrics.queries?.total ?? null,
        avgDuration: metrics.queries?.avgDurationMs ?? null,
      },
      dataSource: metrics.dataSource ?? null,
    };
  } catch {
    return { pool: null, queries: null, dataSource: null };
  }
}

// ============ 自动重连 ============
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 500, shouldRetry = () => true } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        shouldRetry(err) &&
        attempt < maxRetries &&
        (err.message?.includes('connection') ||
          err.message?.includes('timeout') ||
          err.message?.includes('pool') ||
          err.code === 'P1001' ||
          err.code === 'P1002' ||
          err.code === 'P1017');

      if (!isRetryable) throw err;

      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 200;
      logger.warn(`数据库操作失败，${delay.toFixed(0)}ms 后重试 (${attempt + 1}/${maxRetries})`, {
        error: err.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ============ 连接生命周期 ============
async function disconnect() {
  logger.info('断开数据库连接');
  isConnected = false;
  await prisma.$disconnect();
}

// 启动时验证连接
async function connect() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isConnected = true;
    lastPingTime = new Date().toISOString();
    logger.info('数据库连接成功', {
      poolSize: poolConfig.size,
      connectionTimeout: poolConfig.connectionTimeout,
    });
  } catch (err) {
    isConnected = false;
    logger.error('数据库连接失败', { error: err.message });
    // 不抛出，让应用继续启动（数据库可能稍后可用）
  }
}

module.exports = {
  poolConfig,
  healthCheck,
  getStatus,
  getMetrics,
  withRetry,
  connect,
  disconnect,
};
