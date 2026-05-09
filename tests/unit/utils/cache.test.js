// tests/unit/utils/cache.test.js - Redis 缓存工具测试（SKIP_REDIS 模式）
// tests/setup.js 已设置 SKIP_REDIS=true，所有操作应优雅退化

const cache = require('../../../utils/cache');

describe('Cache (SKIP_REDIS=true)', () => {
  describe('isReady', () => {
    it('Redis 禁用时应返回 falsy', () => {
      expect(cache.isReady()).toBeFalsy();
    });
  });

  describe('set', () => {
    it('Redis 禁用时应返回 false', async () => {
      const result = await cache.set('key', 'value');
      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('Redis 禁用时应返回 null', async () => {
      const result = await cache.get('key');
      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('Redis 禁用时应返回 false', async () => {
      const result = await cache.del('key');
      expect(result).toBe(false);
    });
  });

  describe('delPattern', () => {
    it('Redis 禁用时应返回 false', async () => {
      const result = await cache.delPattern('cache:*');
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('Redis 禁用时应返回 false', async () => {
      const result = await cache.exists('key');
      expect(result).toBe(false);
    });
  });

  describe('CACHE_KEYS', () => {
    it('应导出正确的缓存键常量', () => {
      expect(cache.CACHE_KEYS.ARTICLES_LIST).toBe('cache:articles:list');
      expect(cache.CACHE_KEYS.TAGS_LIST).toBe('cache:tags:list');
      expect(cache.CACHE_KEYS.ARTICLE_POPULAR).toBe('cache:articles:popular');
      expect(cache.CACHE_KEYS.ARTICLE_DETAIL(42)).toBe('cache:articles:detail:42');
    });
  });

  describe('CACHE_TTL', () => {
    it('应导出正确的 TTL 常量', () => {
      expect(cache.CACHE_TTL.ARTICLES_LIST).toBe(300);
      expect(cache.CACHE_TTL.ARTICLE_DETAIL).toBe(600);
      expect(cache.CACHE_TTL.ARTICLE_POPULAR).toBe(180);
      expect(cache.CACHE_TTL.TAGS_LIST).toBe(1800);
    });
  });

  describe('close', () => {
    it('Redis 禁用时应静默完成', async () => {
      await expect(cache.close()).resolves.toBeUndefined();
    });
  });
});
