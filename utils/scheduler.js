// utils/scheduler.js — 定时任务调度器
// 基于 node-cron，支持动态启用/禁用、执行日志、耗时统计、手动触发

const cron = require('node-cron');
const logger = require('./logger');

const registry = new Map(); // jobName → { config, task, enabled }

// ============ 任务注册 ============
function register(job) {
  const {
    name,
    schedule,
    run,
    enabled = true,
    timezone = 'Asia/Shanghai',
    runOnInit = false,
  } = job;

  if (!name || !run) {
    throw new Error('任务注册失败: name 和 run 为必填项');
  }

  const entry = { config: { ...job, name, schedule, timezone, runOnInit, enabled }, task: null };

  if (enabled && schedule) {
    startJob(entry);
  }

  if (runOnInit && enabled) {
    setImmediate(() => executeJob(entry));
  }

  registry.set(name, entry);
  return entry;
}

// 执行单个任务
async function executeJob(entry) {
  const { name } = entry.config;
  const start = Date.now();
  logger.info(`[定时任务] ${name} 开始执行`);

  try {
    await entry.config.run();
    const duration = Date.now() - start;
    logger.info(`[定时任务] ${name} 执行完成 (${duration}ms)`);
    return { success: true, duration };
  } catch (err) {
    const duration = Date.now() - start;
    logger.error(`[定时任务] ${name} 执行失败 (${duration}ms): ${err.message}`, { stack: err.stack });
    return { success: false, duration, error: err.message };
  }
}

// 启动 cron
function startJob(entry) {
  if (entry.task) entry.task.stop();

  const { schedule, timezone } = entry.config;
  if (!cron.validate(schedule)) {
    logger.warn(`[定时任务] ${entry.config.name} cron 表达式无效: ${schedule}`);
    return;
  }

  entry.task = cron.schedule(schedule, () => executeJob(entry), {
    timezone,
    scheduled: true,
  });
}

// ============ 控制接口 ============
function getJob(name) {
  return registry.get(name) || null;
}

function getAllJobs() {
  return Array.from(registry.entries()).map(([name, entry]) => ({
    name,
    schedule: entry.config.schedule,
    enabled: entry.config.enabled,
    isRunning: !!entry.task,
  }));
}

function toggleJob(name, enabled) {
  const entry = registry.get(name);
  if (!entry) return false;

  const val = enabled !== undefined ? enabled : !entry.config.enabled;
  entry.config.enabled = val;

  if (val) {
    startJob(entry);
    logger.info(`[定时任务] ${name} 已启用`);
  } else {
    if (entry.task) entry.task.stop();
    entry.task = null;
    logger.info(`[定时任务] ${name} 已禁用`);
  }
  return true;
}

async function triggerJob(name) {
  const entry = registry.get(name);
  if (!entry) throw new Error(`任务 ${name} 未注册`);
  return executeJob(entry);
}

// ============ 停止所有任务 ============
function shutdown() {
  for (const [, entry] of registry) {
    if (entry.task) {
      entry.task.stop();
      entry.task = null;
    }
  }
  logger.info('[定时任务] 调度器已关闭');
}

module.exports = {
  register,
  getJob,
  getAllJobs,
  toggleJob,
  triggerJob,
  shutdown,
};
