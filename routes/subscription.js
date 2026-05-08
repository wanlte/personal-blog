// routes/subscription.js - 订阅路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getPlans, getStatus, subscribe, cancel, getHistory } = require('../controllers/subscriptionController');

/**
 * @swagger
 * /api/subscription/plans:
 *   get:
 *     tags: [订阅]
 *     summary: 获取订阅方案
 *     description: 获取所有可用的订阅方案列表
 *     responses:
 *       200:
 *         description: 订阅方案列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: integer }
 *                   name: { type: string }
 *                   price: { type: number }
 *                   durationDays: { type: integer }
 *                   features: { type: array }
 */
router.get('/plans', getPlans);

/**
 * @swagger
 * /api/subscription/status:
 *   get:
 *     tags: [订阅]
 *     summary: 获取订阅状态
 *     description: 获取当前登录用户的订阅状态
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 订阅状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active: { type: boolean }
 *                 plan: { type: object }
 *                 endDate: { type: string }
 */
router.get('/status', authenticateToken, getStatus);

/**
 * @swagger
 * /api/subscription/subscribe:
 *   post:
 *     tags: [订阅]
 *     summary: 创建订阅
 *     description: 为当前用户创建新的订阅
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubscribeRequest'
 *     responses:
 *       200:
 *         description: 订阅创建成功
 *       400:
 *         description: 参数错误或已订阅
 */
router.post('/subscribe', authenticateToken, subscribe);

/**
 * @swagger
 * /api/subscription/cancel:
 *   post:
 *     tags: [订阅]
 *     summary: 取消订阅
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 取消成功
 *       404:
 *         description: 无活跃订阅
 */
router.post('/cancel', authenticateToken, cancel);

/**
 * @swagger
 * /api/subscription/history:
 *   get:
 *     tags: [订阅]
 *     summary: 订阅历史
 *     description: 获取当前用户的订阅历史记录
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 订阅历史列表
 */
router.get('/history', authenticateToken, getHistory);

module.exports = router;
