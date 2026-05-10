// db/index.js - Prisma Client 单例（连接池 + 慢查询日志）
const { PrismaClient } = require('@prisma/client');
const config = require('../config');
const logger = require('../utils/logger');

const SLOW_QUERY_THRESHOLD_MS = 1000;

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
    { level: 'query', emit: 'event' },
  ],
  // 连接池通过 DATABASE_URL 查询参数配置
  // Prisma 引擎读取 connection_limit, pool_timeout, connect_timeout 等参数
  datasourceUrl: config.database.url,
});

// 慢查询日志（超过 1 秒）
prisma.$on('query', (e) => {
  if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
    logger.warn(`慢查询 [${e.duration}ms]`, {
      query: e.query,
      duration: e.duration,
      params: e.params,
    });
  }
});

// 查询耗时记录（供 metrics 使用）
if (config.server.nodeEnv === 'production') {
  const { dbQueryDuration } = require('../utils/metrics');
  prisma.$on('query', (e) => {
    const label = e.query.length > 60 ? e.query.substring(0, 60) + '...' : e.query;
    dbQueryDuration.observe({ query: label }, e.duration / 1000);
  });
}

module.exports = prisma;
