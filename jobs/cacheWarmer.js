// jobs/cacheWarmer.js — 缓存预热
// 服务启动时执行一次，预加载热门数据到 Redis

const config = require('../config');
const cache = require('../utils/cache');
const prisma = require('../db/index');

module.exports = {
  name: 'cacheWarmer',
  schedule: null,  // 不通过 cron 调度，仅在 runOnInit 时执行
  runOnInit: true,
  enabled: !config.redis.skip,

  async run() {
    if (!cache.isReady()) return { skipped: true, reason: 'Redis 不可用' };

    // 预热文章列表
    const articles = await prisma.article.findMany({
      where: { status: 'published' },
      include: {
        user: { select: { username: true } },
        _count: { select: { likes: true, collections: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    await cache.set('cache:articles:list', articles, 300);

    // 预热标签列表
    const tags = await prisma.tag.findMany({
      include: { _count: { select: { articles: true } } },
    });

    await cache.set('cache:tags:list', tags, 1800);

    // 预热热门文章
    const popular = await prisma.article.findMany({
      where: { status: 'published' },
      orderBy: { views: 'desc' },
      take: 10,
      select: { id: true, title: true, views: true },
    });

    await cache.set('cache:articles:popular', popular, 180);

    return { articles: articles.length, tags: tags.length, popular: popular.length };
  },
};
