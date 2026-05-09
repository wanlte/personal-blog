// tests/app.js - 测试用 Express 应用（不含 listen）
const express = require('express');
const path = require('path');
const compression = require('compression');

// 连接 Redis（安全，SKIP_REDIS=true 时为空操作）
const cache = require('../utils/cache');
cache.connect();

const app = express();

// 标准中间件
app.use(compression());
app.use(express.json());

// 静态文件
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 路由
app.use('/api', require('../routes/auth'));
app.use('/api/articles', require('../routes/articles'));
app.use('/api', require('../routes/comments'));
app.use('/api', require('../routes/tags'));
app.use('/api', require('../routes/stats'));
app.use('/api/upload', require('../routes/upload'));
app.use('/api/subscription', require('../routes/subscription'));
app.use('/api', require('../routes/interact'));
app.use('/api/creator', require('../routes/creator'));
app.use('/api', require('../routes/health'));
app.use('/', require('../routes/seo'));

// 错误处理（捕获所有未处理的路由和错误）
const { notFoundHandler, globalErrorHandler } = require('../middleware/errorHandler');
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
