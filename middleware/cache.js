// middleware/cache.js - 缓存中间件
const { get, set, CACHE_KEYS, CACHE_TTL } = require('../utils/cache');

// 生成缓存键（支持函数或字符串）
function getCacheKey(key, req) {
    if (typeof key === 'function') {
        return key(req);
    }
    return key;
}

// 通用缓存中间件
function cacheMiddleware(key, ttl) {
    return async (req, res, next) => {
        const cacheKey = getCacheKey(key, req);
        
        // 尝试从缓存获取
        const cached = await get(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // 拦截 json 方法，缓存响应
        const originalJson = res.json.bind(res);
        res.json = async (data) => {
            await set(cacheKey, data, ttl);
            return originalJson(data);
        };
        
        next();
    };
}

// 清除文章相关缓存
async function clearArticleCache(articleId = null) {
    const { del, delPattern } = require('../utils/cache');
    
    // 清除文章列表缓存
    await del(CACHE_KEYS.ARTICLES_LIST);
    // 清除热门文章缓存
    await del(CACHE_KEYS.ARTICLE_POPULAR);
    
    // 清除指定文章详情缓存
    if (articleId) {
        await del(CACHE_KEYS.ARTICLE_DETAIL(articleId));
    } else {
        // 清除所有文章详情缓存
        await delPattern('cache:articles:detail:*');
    }
}

// 清除标签缓存
async function clearTagCache() {
    const { del } = require('../utils/cache');
    await del(CACHE_KEYS.TAGS_LIST);
}

module.exports = {
    cacheMiddleware,
    clearArticleCache,
    clearTagCache,
    CACHE_KEYS,
    CACHE_TTL
};
