// routes/seo.js - SEO 路由
const express = require('express');
const router = express.Router();
const { getRSS, getSitemap } = require('../controllers/seoController');

// GET /rss.xml - 生成 RSS 订阅源
router.get('/rss.xml', getRSS);

// GET /sitemap.xml - 生成网站地图
router.get('/sitemap.xml', getSitemap);

module.exports = router;
