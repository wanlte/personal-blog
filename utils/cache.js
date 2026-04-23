// utils/cache.js - Redis 缓存工具
const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// 创建 Redis 客户端
const client = redis.createClient({ url: REDIS_URL });

// 连接错误处理
client.on('error', (err) => {
    console.error('Redis 连接错误:', err.message);
});

client.on('connect', () => {
    console.log('✅ Redis 已连接');
});

// 连接到 Redis
async function connect() {
    if (!client.isOpen) {
        await client.connect();
    }
}

// 设置缓存
async function set(key, value, ttlSeconds = 300) {
    try {
        const data = typeof value === 'object' ? JSON.stringify(value) : value;
        if (ttlSeconds > 0) {
            await client.setEx(key, ttlSeconds, data);
        } else {
            await client.set(key, data);
        }
        return true;
    } catch (err) {
        console.error('Redis set 错误:', err.message);
        return false;
    }
}

// 获取缓存
async function get(key) {
    try {
        const data = await client.get(key);
        if (!data) return null;
        
        // 尝试解析 JSON
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    } catch (err) {
        console.error('Redis get 错误:', err.message);
        return null;
    }
}

// 删除缓存
async function del(key) {
    try {
        await client.del(key);
        return true;
    } catch (err) {
        console.error('Redis del 错误:', err.message);
        return false;
    }
}

// 删除匹配通配符的缓存
async function delPattern(pattern) {
    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
        return true;
    } catch (err) {
        console.error('Redis delPattern 错误:', err.message);
        return false;
    }
}

// 检查缓存是否存在
async function exists(key) {
    try {
        const result = await client.exists(key);
        return result === 1;
    } catch (err) {
        console.error('Redis exists 错误:', err.message);
        return false;
    }
}

// 关闭连接
async function close() {
    if (client.isOpen) {
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
    set,
    get,
    del,
    delPattern,
    exists,
    close,
    CACHE_KEYS,
    CACHE_TTL
};
