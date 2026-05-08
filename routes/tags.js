// routes/tags.js - 标签路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { cacheMiddleware, CACHE_KEYS, CACHE_TTL } = require('../middleware/cache');
const { getTags, createTag, addTagToArticle, getArticleTags, deleteArticleTag } = require('../controllers/tagsController');

/**
 * @swagger
 * /api/tags:
 *   get:
 *     tags: [标签]
 *     summary: 获取所有标签
 *     description: 返回所有标签列表（带缓存）
 *     responses:
 *       200:
 *         description: 标签列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: integer }
 *                   name: { type: string }
 *                   _count: { type: object, description: '关联文章数' }
 */
router.get('/tags', cacheMiddleware(CACHE_KEYS.TAGS_LIST, CACHE_TTL.TAGS_LIST), getTags);

/**
 * @swagger
 * /api/tags:
 *   post:
 *     tags: [标签]
 *     summary: 创建标签
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: 'JavaScript' }
 *     responses:
 *       201:
 *         description: 创建成功
 *       401:
 *         description: 未授权
 */
router.post('/tags', authenticateToken, createTag);

/**
 * @swagger
 * /api/articles/{id}/tags:
 *   post:
 *     tags: [标签]
 *     summary: 给文章添加标签
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
 *             type: object
 *             required: [tagId]
 *             properties:
 *               tagId: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: 添加成功
 *       404:
 *         description: 文章或标签不存在
 */
router.post('/articles/:id/tags', authenticateToken, addTagToArticle);

/**
 * @swagger
 * /api/articles/{id}/tags:
 *   get:
 *     tags: [标签]
 *     summary: 获取文章标签
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 文章标签列表
 */
router.get('/articles/:id/tags', getArticleTags);

/**
 * @swagger
 * /api/articles/{id}/tags/{tagId}:
 *   delete:
 *     tags: [标签]
 *     summary: 删除文章标签
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema: { type: integer }
 *         description: 标签 ID
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/articles/:id/tags/:tagId', authenticateToken, deleteArticleTag);

module.exports = router;
