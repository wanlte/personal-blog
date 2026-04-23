// routes/stats.js - 统计路由
const express = require('express');
const router = express.Router();
const { cacheMiddleware, CACHE_KEYS, CACHE_TTL } = require('../middleware/cache');
const { search, getPopular, getArchive, getArchiveByMonth, getStats } = require('../controllers/statsController');

// GET /api/search - 搜索文章
router.get('/search', search);

// GET /api/popular - 获取热门文章 (带缓存)
router.get('/popular', cacheMiddleware(CACHE_KEYS.ARTICLE_POPULAR, CACHE_TTL.ARTICLE_POPULAR), getPopular);

// GET /api/archive - 获取文章归档
router.get('/archive', getArchive);

// GET /api/archive/:yearMonth - 获取指定月份的文章
router.get('/archive/:yearMonth', getArchiveByMonth);

// GET /api/stats - 获取博客统计数据
router.get('/stats', getStats);

module.exports = router;
