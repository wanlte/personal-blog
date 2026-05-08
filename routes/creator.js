// routes/creator.js - 创作者路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getCreatorStats,
  getCreatorArticles,
  getCreatorEarnings,
  updateCreatorProfile,
  setArticlePaid
} = require('../controllers/creatorController');

/**
 * @swagger
 * /api/creator/stats:
 *   get:
 *     tags: [创作者]
 *     summary: 创作者统计
 *     description: 获取当前用户的创作者数据（文章数、总浏览量、收入等）
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 创作者统计数据
 */
router.get('/stats', authenticateToken, getCreatorStats);

/**
 * @swagger
 * /api/creator/articles:
 *   get:
 *     tags: [创作者]
 *     summary: 创作者文章管理
 *     description: 获取当前用户的所有文章（含草稿和已发布）
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 文章列表（含浏览量、收入等）
 */
router.get('/articles', authenticateToken, getCreatorArticles);

/**
 * @swagger
 * /api/creator/earnings:
 *   get:
 *     tags: [创作者]
 *     summary: 创作者收入明细
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 收入记录列表
 */
router.get('/earnings', authenticateToken, getCreatorEarnings);

/**
 * @swagger
 * /api/creator/profile:
 *   put:
 *     tags: [创作者]
 *     summary: 更新创作者信息
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatorProfileRequest'
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/profile', authenticateToken, updateCreatorProfile);

/**
 * @swagger
 * /api/creator/articles/{id}/paid:
 *   put:
 *     tags: [创作者]
 *     summary: 设置文章付费
 *     description: 将文章设为付费阅读
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaidArticleRequest'
 *     responses:
 *       200:
 *         description: 设置成功
 */
router.put('/articles/:id/paid', authenticateToken, setArticlePaid);

module.exports = router;
