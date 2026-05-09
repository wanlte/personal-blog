// routes/health.js - 数据库健康检查接口
const express = require('express');
const router = express.Router();
const { healthCheck, getStatus, getMetrics } = require('../utils/database');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @swagger
 * /api/health/db:
 *   get:
 *     tags: [健康检查]
 *     summary: 数据库健康检查
 *     description: 检查数据库连接状态、连接池指标和查询统计
 *     responses:
 *       200:
 *         description: 健康检查结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [healthy, unhealthy]
 *                         latency:
 *                           type: number
 *                         lastPing:
 *                           type: string
 *                     pool:
 *                       type: object
 *                       properties:
 *                         size:
 *                           type: number
 *                         connectionTimeout:
 *                           type: number
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         pool:
 *                           type: object
 *                         queries:
 *                           type: object
 *       503:
 *         description: 数据库不可用
 */
router.get('/health/db', asyncHandler(async (_req, res) => {
  const health = await healthCheck();
  const status = getStatus();
  const metrics = await getMetrics();

  res.status(health.status === 'healthy' ? 200 : 503).json({
    success: health.status === 'healthy',
    data: {
      health: {
        status: health.status,
        latency: health.latency,
        lastPing: health.lastPing,
      },
      connection: {
        connected: status.connected,
        poolSize: status.poolConfig.size,
        connectionTimeout: status.poolConfig.connectionTimeout,
        failureCount: status.failureCount,
        uptime: status.uptime,
      },
      metrics,
    },
    message: health.status === 'healthy' ? '数据库连接正常' : '数据库不可用',
    timestamp: new Date().toISOString(),
  });
}));

module.exports = router;
