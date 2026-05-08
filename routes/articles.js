// routes/articles.js - 文章路由
const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { cacheMiddleware, CACHE_KEYS, CACHE_TTL } = require('../middleware/cache');
const {
    getArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    pinArticle,
    saveDraft,
    getDrafts,
    publishDraft
} = require('../controllers/articlesController');

/**
 * @swagger
 * /api/articles:
 *   get:
 *     tags: [文章]
 *     summary: 获取文章列表
 *     description: 获取所有已发布文章列表（支持按标签过滤，带缓存，可选认证获取互动状态）
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *         description: 按标签名过滤
 *     responses:
 *       200:
 *         description: 文章列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: integer }
 *                   title: { type: string }
 *                   summary: { type: string }
 *                   author_name: { type: string }
 *                   views: { type: integer }
 *                   like_count: { type: integer }
 *                   collect_count: { type: integer }
 *                   is_liked: { type: boolean }
 *                   is_collected: { type: boolean }
 *                   created_at: { type: string }
 */
router.get('/', optionalAuth, cacheMiddleware(CACHE_KEYS.ARTICLES_LIST, CACHE_TTL.ARTICLES_LIST), getArticles);

/**
 * @swagger
 * /api/articles:
 *   post:
 *     tags: [文章]
 *     summary: 创建文章
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ArticleRequest'
 *     responses:
 *       200:
 *         description: 创建成功
 *       401:
 *         description: 未授权
 */
router.post('/', authenticateToken, createArticle);

/**
 * @swagger
 * /api/articles/draft:
 *   post:
 *     tags: [文章]
 *     summary: 保存草稿
 *     description: 创建或更新文章草稿
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ArticleRequest'
 *     responses:
 *       200:
 *         description: 草稿保存成功
 */
router.post('/draft', authenticateToken, saveDraft);

/**
 * @swagger
 * /api/articles/drafts/list:
 *   get:
 *     tags: [文章]
 *     summary: 获取草稿列表
 *     description: 获取当前用户的所有草稿
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 草稿列表
 */
router.get('/drafts/list', authenticateToken, getDrafts);

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     tags: [文章]
 *     summary: 获取文章详情
 *     description: 获取单篇文章，自动增加浏览量，可选认证获取互动状态
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 文章详情
 *       404:
 *         description: 文章不存在
 */
router.get('/:id', optionalAuth, cacheMiddleware(CACHE_KEYS.ARTICLE_DETAIL, CACHE_TTL.ARTICLE_DETAIL), getArticle);

/**
 * @swagger
 * /api/articles/{id}:
 *   put:
 *     tags: [文章]
 *     summary: 更新文章
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
 *             $ref: '#/components/schemas/ArticleRequest'
 *     responses:
 *       200:
 *         description: 更新成功
 *       403:
 *         description: 无权修改
 *       404:
 *         description: 文章不存在
 */
router.put('/:id', authenticateToken, updateArticle);

/**
 * @swagger
 * /api/articles/{id}:
 *   delete:
 *     tags: [文章]
 *     summary: 删除文章
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       403:
 *         description: 无权删除
 *       404:
 *         description: 文章不存在
 */
router.delete('/:id', authenticateToken, deleteArticle);

/**
 * @swagger
 * /api/articles/{id}/pin:
 *   put:
 *     tags: [文章]
 *     summary: 置顶/取消置顶
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 操作成功
 */
router.put('/:id/pin', authenticateToken, pinArticle);

/**
 * @swagger
 * /api/articles/{id}/publish:
 *   put:
 *     tags: [文章]
 *     summary: 发布草稿
 *     description: 将草稿状态改为已发布
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 草稿 ID
 *     responses:
 *       200:
 *         description: 发布成功
 */
router.put('/:id/publish', authenticateToken, publishDraft);

module.exports = router;
