// server.js - 博客服务器入口
const express = require('express');
const path = require('path');
const compression = require('compression');

// 连接 Redis（可选，失败不影响运行）
const cache = require('./utils/cache');
const prisma = require('./db/index');
cache.connect();

const app = express();
const PORT = 3000;

// 中间件
const requestLogger = require('./middleware/requestLogger');
const { securityMiddleware } = require('./middleware/security');
const { globalLimiter, authLimiter, registerLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// 1. 请求日志（最先注册，捕获所有请求）
app.use(requestLogger);

// 2. 安全中间件（Helmet 安全头 + CORS）
app.use(securityMiddleware);

// 3. 全局频率限制
app.use(globalLimiter);

// 4. 标准中间件
app.use(compression());
app.use(express.json());
app.use(require('passport').initialize());

// 4.5 API 文档（仅非生产环境可访问）
if (process.env.NODE_ENV !== 'production') {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./config/swagger');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: '博客 API 文档',
    }));
    console.log(`API 文档: http://localhost:${PORT}/api-docs`);
}

// 5. 敏感操作频率限制（在路由处理之前）
app.use('/api/login', authLimiter);
app.use('/api/register', registerLimiter);

// 引入路由
const authRoutes = require('./routes/auth');
const articlesRoutes = require('./routes/articles');
const commentsRoutes = require('./routes/comments');
const tagsRoutes = require('./routes/tags');
const statsRoutes = require('./routes/stats');
const uploadRoutes = require('./routes/upload');
const seoRoutes = require('./routes/seo');
const subscriptionRoutes = require('./routes/subscription');
const interactRoutes = require('./routes/interact');
const creatorRoutes = require('./routes/creator');

// 挂载路由
app.use('/api', authRoutes);           // /api/register, /api/login
app.use('/api', require('./routes/oauth').router);  // /api/auth/github, /api/auth/google
app.use('/api/articles', articlesRoutes); // /api/articles/*
app.use('/api', commentsRoutes);       // /api/articles/:id/comments, /api/comments/:id
app.use('/api', tagsRoutes);           // /api/tags, /api/articles/:id/tags
app.use('/api', statsRoutes);          // /api/search, /api/popular, /api/archive, /api/stats
app.use('/api/upload', uploadRoutes);  // /api/upload
app.use('/api/subscription', subscriptionRoutes); // /api/subscription/*
app.use('/api', interactRoutes);                   // /api/authors, /api/users, /api/articles/:id/like etc.
app.use('/api/creator', creatorRoutes);             // /api/creator/*
app.use('/api/admin', require('./routes/admin'));   // /api/admin/jobs
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

// 6. 404 — 所有路由和静态文件都未匹配
app.use(notFoundHandler);

// 7. 全局错误处理（最后一个中间件）
app.use(globalErrorHandler);

// 初始化定时任务
const scheduler = require('./utils/scheduler');
scheduler.register(require('./jobs/cacheWarmer'));
scheduler.register(require('./jobs/cleanupExpiredTokens'));
scheduler.register(require('./jobs/statsAggregation'));
scheduler.register(require('./jobs/backupDatabase'));
scheduler.register(require('./jobs/subscriptionChecker'));

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`定时任务: ${scheduler.getAllJobs().map(j => j.name).join(', ')}`);
});

// 优雅关闭
process.on('SIGINT', async () => {
    scheduler.shutdown();
    await prisma.$disconnect();
    await cache.close();
    process.exit(0);
});
