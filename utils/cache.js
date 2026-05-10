// utils/cache.js - Redis 缓存工具
const redis = require('redis');
const config = require('../config');

const REDIS_URL = config.redis.url;
const SKIP_REDIS = config.redis.skip;

let client = null;
let isConnected = false;

// 如果禁用 Redis，则创建空实现
if (SKIP_REDIS) {
    console.log('⚠️ Redis 已禁用，使用内存缓存');
} else {
    try {
        client = redis.createClient({ url: REDIS_URL });

        // 静默处理连接错误，不输出日志
        client.on('error', () => {});
        
        client.on('connect', () => {
            isConnected = true;
            console.log('✅ Redis 已连接');
        });
    } catch (e) {
        client = null;
    }
}

// 连接到 Redis
async function connect() {
    if (client && !client.isOpen && !SKIP_REDIS) {
        try {
            await client.connect();
        } catch (e) {
            // 连接失败，静默处理
        }
    }
}

// 检查是否可用
function isReady() {
    return client && client.isOpen && isConnected;
}

// 设置缓存
async function set(key, value, ttlSeconds = 300) {
    if (!isReady()) return false;
    try {
        const data = typeof value === 'object' ? JSON.stringify(value) : value;
        if (ttlSeconds > 0) {
            await client.setEx(key, ttlSeconds, data);
        } else {
            await client.set(key, data);
        }
        return true;
    } catch (err) {
        return false;
    }
}

// 获取缓存
async function get(key) {
    if (!isReady()) return null;
    try {
        const data = await client.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    } catch (err) {
        return null;
    }
}

// 删除缓存
async function del(key) {
    if (!isReady()) return false;
    try {
        await client.del(key);
        return true;
    } catch (err) {
        return false;
    }
}

// 删除匹配通配符的缓存
async function delPattern(pattern) {
    if (!isReady()) return false;
    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
        return true;
    } catch (err) {
        return false;
    }
}

// 检查缓存是否存在
async function exists(key) {
    if (!isReady()) return false;
    try {
        const result = await client.exists(key);
        return result === 1;
    } catch (err) {
        return false;
    }
}

// 关闭连接
async function close() {
    if (client && client.isOpen) {
        await client.quit();
    }
}

// 缓存键前缀
const CACHE_KEYS = {
    ARTICLES_LIST: 'cache:articles:list',
    ARTICLE_DETAIL: (id) => `cache:articles:detail:${id}`,
    ARTICLE_POPULAR: 'cache:articles:popular',
    TAGS_LIST: 'cache:tags:list',
};

// 缓存 TTL（秒）
const CACHE_TTL = {
    ARTICLES_LIST: 300,      // 5分钟
    ARTICLE_DETAIL: 600,     // 10分钟
    ARTICLE_POPULAR: 180,    // 3分钟
    TAGS_LIST: 1800,        // 30分钟
};

module.exports = {
    client,
    connect,
    isReady,
    set,
    get,
    del,
    delPattern,
    exists,
    close,
    CACHE_KEYS,
    CACHE_TTL
};
