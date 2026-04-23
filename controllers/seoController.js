// controllers/seoController.js - SEO 控制器
const RSS = require('rss');
const prisma = require('../db/index');

// 生成 RSS 订阅源
async function getRSS(req, res) {
    try {
        const articles = await prisma.article.findMany({
            include: {
                user: { select: { username: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        
        const feed = new RSS({
            title: '个人博客',
            description: '记录学习与成长',
            feed_url: 'http://localhost:3000/rss.xml',
            site_url: 'http://localhost:3000',
            language: 'zh-cn',
            copyright: `Copyright ${new Date().getFullYear()} 个人博客`,
            pubDate: new Date(),
            ttl: 60
        });
        
        articles.forEach(article => {
            feed.item({
                title: article.title,
                description: article.summary || article.content?.substring(0, 200) || '暂无摘要',
                url: `http://localhost:3000/article.html?id=${article.id}`,
                author: article.user?.username || '匿名',
                date: article.createdAt,
                guid: article.id.toString()
            });
        });
        
        res.set('Content-Type', 'application/rss+xml');
        res.send(feed.xml());
    } catch (error) {
        console.error('获取文章失败:', error.message);
        res.status(500).send('服务器错误');
    }
}

// 生成网站地图
async function getSitemap(req, res) {
    const baseUrl = 'http://localhost:3000';
    
    try {
        const articles = await prisma.article.findMany({
            where: { status: 'published' },
            select: { id: true, updatedAt: true },
            orderBy: { id: 'desc' }
        });
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // 添加首页
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>1.0</priority>\n`;
        xml += `  </url>\n`;
        
        // 添加文章页
        articles.forEach(article => {
            const date = new Date(article.updatedAt).toISOString().split('T')[0];
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/article.html?id=${article.id}</loc>\n`;
            xml += `    <lastmod>${date}</lastmod>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.8</priority>\n`;
            xml += `  </url>\n`;
        });
        
        xml += '</urlset>';
        
        res.setHeader('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('生成sitemap失败:', error.message);
        res.status(500).send('服务器错误');
    }
}

module.exports = {
    getRSS,
    getSitemap
};
