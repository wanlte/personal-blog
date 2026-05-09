// tests/unit/utils/scheduler.test.js - 定时任务调度器测试
jest.mock('node-cron', () => {
  const mockTask = {
    stop: jest.fn(),
  };
  const scheduleMock = jest.fn(() => mockTask);
  scheduleMock.validate = jest.fn(() => true);
  return {
    schedule: scheduleMock,
    validate: jest.fn(() => true),
  };
});

jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const cron = require('node-cron');
const scheduler = require('../../../utils/scheduler');

describe('scheduler', () => {
  beforeEach(() => {
    // 清注册表：关闭所有任务后重新开始
    scheduler.shutdown();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('应注册并启用定时任务', () => {
      const run = jest.fn();
      const job = { name: 'testJob', schedule: '*/5 * * * *', run };

      scheduler.register(job);

      const entry = scheduler.getJob('testJob');
      expect(entry).not.toBeNull();
      expect(entry.config.name).toBe('testJob');
      expect(entry.config.enabled).toBe(true);
    });

    it('缺少 name 或 run 应抛出错误', () => {
      expect(() => scheduler.register({ schedule: '* * * * *' })).toThrow(
        '任务注册失败: name 和 run 为必填项'
      );
      expect(() => scheduler.register({ name: 'noRun', run: null })).toThrow(
        '任务注册失败: name 和 run 为必填项'
      );
    });

    it('enabled=false 不应启动 cron', () => {
      const run = jest.fn();
      scheduler.register({ name: 'disabledJob', schedule: '* * * * *', run, enabled: false });

      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('无 schedule 且 enabled=true 不应启动 cron', () => {
      const run = jest.fn();
      scheduler.register({ name: 'noSchedule', run, enabled: true });

      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it('无效 cron 表达式应输出警告', () => {
      cron.validate.mockReturnValueOnce(false);
      const run = jest.fn();
      scheduler.register({ name: 'badCron', schedule: 'invalid', run });

      expect(jest.requireMock('../../../utils/logger').warn).toHaveBeenCalled();
    });
  });

  describe('getAllJobs', () => {
    it('应返回所有已注册任务列表', () => {
      scheduler.register({ name: 'job1', schedule: '*/1 * * * *', run: jest.fn() });
      scheduler.register({ name: 'job2', schedule: '*/5 * * * *', run: jest.fn(), enabled: false });

      const jobs = scheduler.getAllJobs();
      const names = jobs.map((j) => j.name);
      expect(names).toEqual(expect.arrayContaining(['job1', 'job2']));
    });
  });

  describe('toggleJob', () => {
    it('应切换任务启用状态', () => {
      const run = jest.fn();
      scheduler.register({ name: 'toggleMe', schedule: '*/5 * * * *', run });

      scheduler.toggleJob('toggleMe', false);
      let entry = scheduler.getJob('toggleMe');
      expect(entry.config.enabled).toBe(false);

      scheduler.toggleJob('toggleMe', true);
      entry = scheduler.getJob('toggleMe');
      expect(entry.config.enabled).toBe(true);
    });

    it('不存在的任务应返回 false', () => {
      expect(scheduler.toggleJob('nobody')).toBe(false);
    });
  });

  describe('triggerJob', () => {
    it('应手动触发任务执行', async () => {
      const run = jest.fn().mockResolvedValue('done');
      scheduler.register({ name: 'manualJob', schedule: '0 0 * * *', run });

      const result = await scheduler.triggerJob('manualJob');
      expect(run).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('任务抛错应返回失败结果', async () => {
      const run = jest.fn().mockRejectedValue(new Error('任务失败'));
      scheduler.register({ name: 'failJob', run });

      const result = await scheduler.triggerJob('failJob');
      expect(result.success).toBe(false);
      expect(result.error).toBe('任务失败');
    });

    it('触发不存在的任务应抛出错误', async () => {
      await expect(scheduler.triggerJob('ghost')).rejects.toThrow('任务 ghost 未注册');
    });
  });

  describe('shutdown', () => {
    it('应停止所有运行中的任务', () => {
      const run = jest.fn();
      scheduler.register({ name: 's1', schedule: '*/1 * * * *', run });
      scheduler.register({ name: 's2', schedule: '*/1 * * * *', run });

      scheduler.shutdown();
      const jobs = scheduler.getAllJobs();
      jobs.forEach((j) => expect(j.isRunning).toBe(false));
    });
  });
});
