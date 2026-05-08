// routes/stats.js - 统计路由
const express = require('express');
const router = express.Router();
const { cacheMiddleware, CACHE_KEYS, CACHE_TTL } = require('../middleware/cache');
const { search, getPopular, getArchive, getArchiveByMonth, getStats } = require('../controllers/statsController');

/**
 * @swagger
 * /api/search:
 *   get:
 *     tags: [统计]
 *     summary: 搜索文章
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: 搜索关键词
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: 每页数量
 *     responses:
 *       200:
 *         description: 搜索结果列表
 */
router.get('/search', search);

/**
 * @swagger
 * /api/popular:
 *   get:
 *     tags: [统计]
 *     summary: 热门文章
 *     description: 获取浏览量最高的文章列表（带缓存）
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: 返回数量
 *     responses:
 *       200:
 *         description: 热门文章列表
 */
router.get('/popular', cacheMiddleware(CACHE_KEYS.ARTICLE_POPULAR, CACHE_TTL.ARTICLE_POPULAR), getPopular);

/**
 * @swagger
 * /api/archive:
 *   get:
 *     tags: [统计]
 *     summary: 文章归档
 *     description: 按年月归档文章
 *     responses:
 *       200:
 *         description: 归档数据
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   yearMonth: { type: string, example: '2026-05' }
 *                   count: { type: integer }
 *                   articles: { type: array, items: { type: object } }
 */
router.get('/archive', getArchive);

/**
 * @swagger
 * /api/archive/{yearMonth}:
 *   get:
 *     tags: [统计]
 *     summary: 按月查看文章
 *     parameters:
 *       - in: path
 *         name: yearMonth
 *         required: true
 *         schema: { type: string, example: '2026-05' }
 *         description: 年月（格式 YYYY-MM）
 *     responses:
 *       200:
 *         description: 该月的文章列表
 */
router.get('/archive/:yearMonth', getArchiveByMonth);

/**
 * @swagger
 * /api/stats:
 *   get:
 *     tags: [统计]
 *     summary: 站点统计
 *     description: 获取文章数、评论数、用户数等整体数据
 *     responses:
 *       200:
 *         description: 站点统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 articleCount: { type: integer }
 *                 commentCount: { type: integer }
 *                 userCount: { type: integer }
 *                 totalViews: { type: integer }
 */
router.get('/stats', getStats);

module.exports = router;
