// controllers/seoController.js - SEO 控制器
const RSS = require('rss');
const db = require('../db/db');

// 生成 RSS 订阅源
function getRSS(req, res) {
    const sql = `
        SELECT articles.*, users.username as author_name 
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        ORDER BY articles.created_at DESC 
        LIMIT 10
    `;
    
    db.all(sql, [], (err, articles) => {
        if (err) {
            console.error('获取文章失败:', err.message);
            res.status(500).send('服务器错误');
            return;
        }
        
        // 创建 RSS feed
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
        
        // 添加文章到 RSS
        articles.forEach(article => {
            feed.item({
                title: article.title,
                description: article.summary || article.content?.substring(0, 200) || '暂无摘要',
                url: `http://localhost:3000/article.html?id=${article.id}`,
                author: article.author_name || '匿名',
                date: article.created_at,
                guid: article.id.toString()
            });
        });
        
        res.set('Content-Type', 'application/rss+xml');
        res.send(feed.xml());
    });
}

// 生成网站地图
function getSitemap(req, res) {
    const baseUrl = 'http://localhost:3000';
    
    db.all('SELECT id, updated_at FROM articles WHERE status = "published" ORDER BY id DESC', [], (err, articles) => {
        if (err) {
            console.error('生成sitemap失败:', err.message);
            res.status(500).send('服务器错误');
            return;
        }
        
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
            const date = new Date(article.updated_at).toISOString().split('T')[0];
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
    });
}

module.exports = {
    getRSS,
    getSitemap
};
