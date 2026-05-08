// routes/seo.js - SEO 路由
const express = require('express');
const router = express.Router();
const { getRSS, getSitemap } = require('../controllers/seoController');

/**
 * @swagger
 * /rss.xml:
 *   get:
 *     tags: [SEO]
 *     summary: RSS 订阅源
 *     description: 生成博客 RSS 2.0 订阅源 XML
 *     responses:
 *       200:
 *         description: RSS XML
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 */
router.get('/rss.xml', getRSS);

/**
 * @swagger
 * /sitemap.xml:
 *   get:
 *     tags: [SEO]
 *     summary: 网站地图
 *     description: 生成 SEO 站点地图 XML
 *     responses:
 *       200:
 *         description: Sitemap XML
 *         content:
 *           application/xml:
 *             schema:
 *               type: string
 */
router.get('/sitemap.xml', getSitemap);

module.exports = router;
