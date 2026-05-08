// utils/metrics.js - Prometheus 监控指标
const promClient = require('prom-client');

// 默认开启默认指标（Node.js 运行时）
promClient.collectDefaultMetrics({
    prefix: 'blog_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// HTTP 请求总数计数器（标签：method, route, status）
const httpRequestsTotal = new promClient.Counter({
    name: 'blog_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
});

// HTTP 请求耗时直方图（标签：method, route）
const httpRequestDuration = new promClient.Histogram({
    name: 'blog_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
});

// 在线用户数（每 5 分钟自动衰减）
const activeUsersGauge = new promClient.Gauge({
    name: 'blog_active_users',
    help: 'Number of active users in the last 5 minutes',
});

// 数据库查询耗时直方图
const dbQueryDuration = new promClient.Histogram({
    name: 'blog_db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['query'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// 缓存命中率计数器
const cacheHitsTotal = new promClient.Counter({
    name: 'blog_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['key'],
});

const cacheMissesTotal = new promClient.Counter({
    name: 'blog_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['key'],
});

// 导出 /metrics 端点内容
async function getMetrics() {
    return promClient.register.metrics();
}

// Express 中间件：自动记录 HTTP 指标
function metricsMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.originalUrl;
        httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
        httpRequestDuration.observe({ method: req.method, route }, duration);
    });
    next();
}

// 标记用户在线（调用方在登录/活动时调用）
function markUserActive() {
    activeUsersGauge.inc();
}

// 用户离线（调用方在登出/超时时调用）
function markUserInactive() {
    activeUsersGauge.dec();
}

module.exports = {
    promClient,
    httpRequestsTotal,
    httpRequestDuration,
    activeUsersGauge,
    dbQueryDuration,
    cacheHitsTotal,
    cacheMissesTotal,
    getMetrics,
    metricsMiddleware,
    markUserActive,
    markUserInactive,
};
