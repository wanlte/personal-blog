// routes/articles.js - 文章路由
const express = require('express');
const router = express.Router();
const apicache = require('apicache');
const cache = apicache.middleware;
const { authenticateToken } = require('../middleware/auth');
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
router.get('/', cache('5 minutes'), getArticles);

// POST /api/articles - 创建新文章
router.post('/', authenticateToken, createArticle);

// GET /api/articles/:id - 获取单篇文章
router.get('/:id', getArticle);

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
