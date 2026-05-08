// jobs/statsAggregation.js — 文章阅读量统计聚合
// 每天凌晨 2:00 执行，汇总站点数据

const prisma = require('../db/index');

module.exports = {
  name: 'statsAggregation',
  schedule: '0 2 * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    // 汇总各状态文章数
    const counts = await prisma.article.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const publishedCount = counts.find((c) => c.status === 'published')?._count.id || 0;
    const draftCount = counts.find((c) => c.status === 'draft')?._count.id || 0;

    // 总阅读量
    const totalViews = await prisma.article.aggregate({
      _sum: { views: true },
    });

    // 总用户数
    const userCount = await prisma.user.count();

    // 总评论数
    const commentCount = await prisma.comment.count();

    // TOP 5 热门文章
    const topArticles = await prisma.article.findMany({
      where: { status: 'published' },
      orderBy: { views: 'desc' },
      take: 5,
      select: { id: true, title: true, views: true },
    });

    return {
      publishedCount,
      draftCount,
      totalViews: totalViews._sum.views || 0,
      userCount,
      commentCount,
      topArticles,
    };
  },
};
