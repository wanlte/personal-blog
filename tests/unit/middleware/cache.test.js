// tests/unit/middleware/cache.test.js - 缓存中间件测试
jest.mock('../../../utils/cache', () => ({
  isReady: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delPattern: jest.fn(),
  CACHE_KEYS: {
    ARTICLES_LIST: 'cache:articles:list',
    ARTICLE_DETAIL: (id) => `cache:articles:detail:${id}`,
    ARTICLE_POPULAR: 'cache:articles:popular',
    TAGS_LIST: 'cache:tags:list',
  },
  CACHE_TTL: {
    ARTICLES_LIST: 300,
    TAGS_LIST: 1800,
  },
}));

const cache = require('../../../utils/cache');
const {
  cacheMiddleware,
  clearArticleCache,
  clearTagCache,
  isRedisReady,
} = require('../../../middleware/cache');

describe('cacheMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Redis 不可用时应跳过缓存直接 next', async () => {
    cache.isReady.mockReturnValue(false);
    const middleware = cacheMiddleware('cache:test', 300);
    const req = {};
    const res = {};
    const next = jest.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });

  it('命中缓存时应直接返回缓存数据', async () => {
    cache.isReady.mockReturnValue(true);
    cache.get.mockResolvedValue({ data: 'cached' });

    const middleware = cacheMiddleware('cache:test', 300);
    const req = {};
    const res = { json: jest.fn() };
    const next = jest.fn();

    await middleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ data: 'cached' });
    expect(next).not.toHaveBeenCalled();
  });

  it('未命中缓存时应拦截 res.json 并继续', async () => {
    cache.isReady.mockReturnValue(true);
    cache.get.mockResolvedValue(null);

    const middleware = cacheMiddleware('cache:test', 300);
    const req = {};
    const originalJson = jest.fn();
    const res = { json: originalJson };
    const next = jest.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    // res.json 被替换为缓存版本
    expect(res.json).not.toBe(originalJson);

    // 调用被拦截的 json 方法
    await res.json({ data: 'fresh' });
    expect(cache.set).toHaveBeenCalledWith('cache:test', { data: 'fresh' }, 300);
    expect(originalJson).toHaveBeenCalledWith({ data: 'fresh' });
  });

  it('应支持函数类型的 key', async () => {
    cache.isReady.mockReturnValue(true);
    cache.get.mockResolvedValue(null);

    const keyFn = (req) => `cache:article:${req.params.id}`;
    const middleware = cacheMiddleware(keyFn, 600);
    const req = { params: { id: '42' } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    await res.json({ title: 'test' });
    expect(cache.set).toHaveBeenCalledWith('cache:article:42', { title: 'test' }, 600);
  });
});

describe('clearArticleCache', () => {
  it('应删除文章列表和热门缓存', async () => {
    await clearArticleCache();
    expect(cache.del).toHaveBeenCalledWith('cache:articles:list');
    expect(cache.del).toHaveBeenCalledWith('cache:articles:popular');
  });

  it('指定 articleId 时应删除详情缓存', async () => {
    await clearArticleCache(99);
    expect(cache.del).toHaveBeenCalledWith('cache:articles:detail:99');
  });

  it('无 articleId 时应删除所有详情缓存', async () => {
    await clearArticleCache();
    expect(cache.delPattern).toHaveBeenCalledWith('cache:articles:detail:*');
  });
});

describe('clearTagCache', () => {
  it('应删除标签列表缓存', async () => {
    await clearTagCache();
    expect(cache.del).toHaveBeenCalledWith('cache:tags:list');
  });
});

describe('isRedisReady', () => {
  it('应调用 cache.isReady', () => {
    cache.isReady.mockReturnValue(false);
    expect(isRedisReady()).toBe(false);
    cache.isReady.mockReturnValue(true);
    expect(isRedisReady()).toBe(true);
  });
});
