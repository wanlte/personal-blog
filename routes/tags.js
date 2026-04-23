// routes/tags.js - 标签路由
const express = require('express');
const router = express.Router();
const apicache = require('apicache');
const cache = apicache.middleware;
const { authenticateToken } = require('../middleware/auth');
const { getTags, createTag, addTagToArticle, getArticleTags, deleteArticleTag } = require('../controllers/tagsController');

// GET /api/tags - 获取所有标签 (带缓存)
router.get('/', cache('1 hour'), getTags);

// POST /api/tags - 创建标签
router.post('/', authenticateToken, createTag);

// POST /api/articles/:id/tags - 给文章添加标签
router.post('/articles/:id/tags', authenticateToken, addTagToArticle);

// GET /api/articles/:id/tags - 获取文章的所有标签
router.get('/articles/:id/tags', getArticleTags);

// DELETE /api/articles/:id/tags/:tagId - 删除文章标签
router.delete('/articles/:id/tags/:tagId', authenticateToken, deleteArticleTag);

module.exports = router;
