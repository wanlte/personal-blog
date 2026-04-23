// server.js - 博客服务器入口
const express = require('express');
const path = require('path');
const compression = require('compression');
const apicache = require('apicache');

// 初始化 Prisma Client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const PORT = 3000;

// 引入路由
const authRoutes = require('./routes/auth');
const articlesRoutes = require('./routes/articles');
const commentsRoutes = require('./routes/comments');
const tagsRoutes = require('./routes/tags');
const statsRoutes = require('./routes/stats');
const uploadRoutes = require('./routes/upload');
const seoRoutes = require('./routes/seo');

// 中间件
app.use(compression()); // 压缩
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 挂载路由
app.use('/api', authRoutes);           // /api/register, /api/login
app.use('/api/articles', articlesRoutes); // /api/articles/*
app.use('/api', commentsRoutes);       // /api/articles/:id/comments, /api/comments/:id
app.use('/api', tagsRoutes);           // /api/tags, /api/articles/:id/tags
app.use('/api', statsRoutes);          // /api/search, /api/popular, /api/archive, /api/stats
app.use('/api/upload', uploadRoutes);  // /api/upload
app.use('/', seoRoutes);               // /rss.xml, /sitemap.xml

// 静态文件缓存
app.use(express.static('public', {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    etag: true,
    lastModified: true
}));

// 提供上传文件访问
app.use('/uploads', express.static('uploads', {
    maxAge: 30 * 24 * 60 * 60 * 1000,
}));

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 优雅关闭
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
