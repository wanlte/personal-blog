// routes/articles.js - 文章路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
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

// GET /api/articles - 获取所有已发布的文章列表 (带缓存)
router.get('/', cacheMiddleware(CACHE_KEYS.ARTICLES_LIST, CACHE_TTL.ARTICLES_LIST), getArticles);

// POST /api/articles - 创建新文章
router.post('/', authenticateToken, createArticle);

// GET /api/articles/:id - 获取单篇文章 (带缓存)
router.get('/:id', cacheMiddleware(CACHE_KEYS.ARTICLE_DETAIL, CACHE_TTL.ARTICLE_DETAIL), getArticle);

// PUT /api/articles/:id - 更新文章
router.put('/:id', authenticateToken, updateArticle);

// DELETE /api/articles/:id - 删除文章
router.delete('/:id', authenticateToken, deleteArticle);

// PUT /api/articles/:id/pin - 置顶文章
router.put('/:id/pin', authenticateToken, pinArticle);

// POST /api/articles/draft - 保存草稿
router.post('/draft', authenticateToken, saveDraft);

// GET /api/articles/drafts - 获取草稿列表
router.get('/drafts/list', authenticateToken, getDrafts);

// PUT /api/articles/:id/publish - 发布草稿
router.put('/:id/publish', authenticateToken, publishDraft);

module.exports = router;
