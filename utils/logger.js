// utils/logger.js - 结构化日志
const winston = require('winston');
const config = require('../config');
const { format } = winston;

// 控制台输出格式
const consoleFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, service, requestId, stack, ...meta }) => {
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        const svc = service ? ` (${service})` : '';
        const rid = requestId ? ` [req:${requestId}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        const stackStr = stack ? `\n${stack}` : '';
        return `${prefix}${svc}${rid} ${message}${metaStr}${stackStr}`;
    })
);

// JSON 输出格式（生产环境用）
const jsonFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.json()
);

const logger = winston.createLogger({
    level: config.log.level,
    defaultMeta: { service: 'blog' },
    transports: [
        new winston.transports.Console({
            format: config.server.nodeEnv === 'production' ? jsonFormat : consoleFormat,
        }),
    ],
});

// 生产环境可加文件日志
if (config.server.nodeEnv === 'production' && config.log.dir) {
    logger.add(
        new winston.transports.File({
            filename: `${config.log.dir}/error.log`,
            level: 'error',
            format: jsonFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        })
    );
    logger.add(
        new winston.transports.File({
            filename: `${config.log.dir}/combined.log`,
            format: jsonFormat,
            maxsize: 10 * 1024 * 1024,
            maxFiles: 10,
        })
    );
}

// 带请求追踪 ID 的日志包装
function withRequestId(requestId) {
    return {
        info: (msg, meta) => logger.info(msg, { ...meta, requestId }),
        warn: (msg, meta) => logger.warn(msg, { ...meta, requestId }),
        error: (msg, meta) => logger.error(msg, { ...meta, requestId }),
        debug: (msg, meta) => logger.debug(msg, { ...meta, requestId }),
    };
}

// Express 中间件：注入请求追踪 ID
function requestLogger(req, res, next) {
    req.requestId = req.headers['x-request-id']
        || req.headers['x-trace-id']
        || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    req.log = withRequestId(req.requestId);

    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        req.log[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration,
        });
    });
    next();
}

module.exports = logger;
module.exports.withRequestId = withRequestId;
module.exports.requestLogger = requestLogger;
