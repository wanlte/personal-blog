// middleware/requestLogger.js - 请求日志记录
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
    // 生成或复用请求追踪 ID
    req.requestId = req.headers['x-request-id']
        || req.headers['x-trace-id']
        || uuidv4();

    // 在响应头中注入追踪 ID
    res.setHeader('X-Request-Id', req.requestId);

    // 记录请求开始
    const start = Date.now();
    const userAgent = req.headers['user-agent'] || '-';
    const ip = req.ip || req.connection?.remoteAddress || '-';
    const method = req.method;
    const url = req.originalUrl || req.url;

    // 请求结束时记录日志
    res.on('finish', () => {
        const responseTime = Date.now() - start;
        const statusCode = res.statusCode;

        logger.info(`${method} ${url} ${statusCode} ${responseTime}ms`, {
            requestId: req.requestId,
            method,
            url,
            statusCode,
            responseTime,
            userAgent,
            ip,
        });
    });

    next();
}

module.exports = requestLogger;
