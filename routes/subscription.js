// routes/subscription.js - 订阅路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getPlans, getStatus, subscribe, cancel, getHistory } = require('../controllers/subscriptionController');

// GET /api/subscription/plans - 获取所有订阅方案
router.get('/plans', getPlans);

// GET /api/subscription/status - 获取当前用户订阅状态 (需认证)
router.get('/status', authenticateToken, getStatus);

// POST /api/subscription/subscribe - 创建订阅 (需认证)
router.post('/subscribe', authenticateToken, subscribe);

// POST /api/subscription/cancel - 取消订阅 (需认证)
router.post('/cancel', authenticateToken, cancel);

// GET /api/subscription/history - 获取订阅历史 (需认证)
router.get('/history', authenticateToken, getHistory);

module.exports = router;
