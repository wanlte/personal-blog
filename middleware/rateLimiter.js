// middleware/rateLimiter.js - 请求频率限制
const rateLimit = require('express-rate-limit');
const { isReady } = require('../utils/cache');

// rate-limit-redis 为可选依赖，加载失败时回退内存存储
let RedisStore = null;
try {
    RedisStore = require('rate-limit-redis');
} catch {
    // 回退到默认内存存储
}

// 创建 Redis 兼容的存储（仅当 Redis 可用时）
function createRedisStore() {
    if (!RedisStore || !isReady()) return undefined;
    try {
        const { client } = require('../utils/cache');
        return new RedisStore({
            sendCommand: (...args) => client.sendCommand(args),
        });
    } catch {
        return undefined;
    }
}

// 通用工厂：创建限制器（覆盖 message 以返回统一 JSON 格式）
function createLimiter(options) {
    const { message: userMsg, ...rest } = options;
    return rateLimit({
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(),
        message: {
            success: false,
            data: null,
            message: userMsg || '请求过于频繁，请稍后再试',
            timestamp: new Date().toISOString(),
        },
        ...rest,
    });
}

// 全局限制：15 分钟内最多 100 次请求
const globalLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '请求过于频繁，请 15 分钟后再试',
});

// 登录限制：15 分钟内最多 5 次尝试
const authLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: '登录尝试过于频繁，请 15 分钟后再试',
    skipSuccessfulRequests: true,
});

// 注册限制：1 小时内最多 3 次
const registerLimiter = createLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: '注册过于频繁，请 1 小时后再试',
});

// API 限制：1 分钟内最多 30 次
const apiLimiter = createLimiter({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: 'API 请求过于频繁，请稍后再试',
});

module.exports = {
    globalLimiter,
    authLimiter,
    registerLimiter,
    apiLimiter,
};
