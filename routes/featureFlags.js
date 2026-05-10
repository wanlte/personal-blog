// routes/featureFlags.js - 特性开关公开路由
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { featureFlags } = require('../middleware/featureFlags');
const ctrl = require('../controllers/featureFlagsController');

/**
 * @swagger
 * /api/features:
 *   get:
 *     tags: [特性开关]
 *     summary: 获取当前用户的特性开关状态
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 特性开关状态映射
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: boolean
 *                   example:
 *                     NEW_ARTICLE_EDITOR: false
 *                     ADVANCED_ANALYTICS: false
 *                     PAYMENT_V2: false
 *                 message:
 *                   type: string
 */
router.get('/features', optionalAuth, featureFlags(), ctrl.getCurrentUserFlags);

module.exports = router;
