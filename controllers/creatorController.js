const prisma = require('../db/index');

// 获取创作者统计
async function getCreatorStats(req, res) {
  const userId = req.user.userId;

  try {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId } });

    const [totalArticles, totalViews, totalLikes, totalComments, totalFavorites] = await Promise.all([
      prisma.article.count({ where: { userId, status: 'published' } }),
      prisma.article.aggregate({ where: { userId }, _sum: { views: true } }),
      prisma.articleLike.count({ where: { article: { userId } } }),
      prisma.comment.count({ where: { article: { userId } } }),
      prisma.articleCollection.count({ where: { article: { userId } } })
    ]);

    const followerCount = await prisma.userFollow.count({ where: { followingId: userId } });
    const draftCount = await prisma.article.count({ where: { userId, status: 'draft' } });

    // 本月收入
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEarnings = await prisma.articlePurchase.aggregate({
      where: { article: { userId }, createdAt: { gte: monthStart } },
      _sum: { amount: true }
    });

    // 近7天文章趋势
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = await prisma.article.count({
        where: { userId, createdAt: { gte: dayStart, lt: dayEnd } }
      });
      trend.push({ date: date.toISOString().split('T')[0], count });
    }

    res.json({
      profile: profile ? { bio: profile.bio, avatar: profile.avatar, isVerified: profile.isVerified } : null,
      totalArticles,
      totalViews: totalViews._sum.views || 0,
      totalLikes,
      totalComments,
      totalFavorites,
      followerCount,
      draftCount,
      monthEarnings: Number(monthEarnings._sum.amount || 0),
      totalEarnings: profile ? Number(profile.totalEarnings || 0) : 0,
      trend
    });
  } catch (error) {
    console.error('获取创作者统计失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 获取创作者文章管理列表
async function getCreatorArticles(req, res) {
  const userId = req.user.userId;
  const { page = 1, status, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = { userId };
    if (status) where.status = status;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          _count: { select: { comments: true, likes: true, collections: true } },
          tags: { include: { tag: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.article.count({ where })
    ]);

    res.json({
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        status: a.status,
        isPaid: a.isPaid,
        price: a.price ? Number(a.price) : 0,
        views: a.views,
        commentCount: a._count.comments,
        likeCount: a._count.likes,
        favoriteCount: a._count.collections,
        createdAt: a.createdAt,
        tags: a.tags.map(t => t.tag.name)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取创作者文章失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 获取创作者订阅收入明细
async function getCreatorEarnings(req, res) {
  const userId = req.user.userId;
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [purchases, total] = await Promise.all([
      prisma.articlePurchase.findMany({
        where: { article: { userId } },
        include: {
          article: { select: { id: true, title: true } },
          user: { select: { id: true, username: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.articlePurchase.count({ where: { article: { userId } } })
    ]);

    const totalEarnings = await prisma.articlePurchase.aggregate({
      where: { article: { userId } },
      _sum: { amount: true }
    });

    res.json({
      purchases: purchases.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        articleTitle: p.article.title,
        buyerName: p.user.username,
        createdAt: p.createdAt
      })),
      totalEarnings: Number(totalEarnings._sum.amount || 0),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取创作者收入失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 更新创作者简介
async function updateCreatorProfile(req, res) {
  const userId = req.user.userId;
  const { bio, avatar } = req.body;

  try {
    const profile = await prisma.creatorProfile.upsert({
      where: { userId },
      update: { ...(bio !== undefined && { bio }), ...(avatar !== undefined && { avatar }) },
      create: { userId, bio, avatar }
    });
    res.json({ success: true, profile });
  } catch (error) {
    console.error('更新创作者信息失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// 设置文章付费
async function setArticlePaid(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;
  const { isPaid, price } = req.body;

  try {
    const article = await prisma.article.findUnique({ where: { id: parseInt(id) } });
    if (!article) return res.status(404).json({ error: '文章不存在' });
    if (article.userId !== userId) return res.status(403).json({ error: '无权限' });

    const updated = await prisma.article.update({
      where: { id: parseInt(id) },
      data: { isPaid: isPaid ? 1 : 0, price: isPaid ? (price || 0) : 0 }
    });
    res.json({ success: true, isPaid: updated.isPaid, price: Number(updated.price) });
  } catch (error) {
    console.error('设置付费失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

module.exports = {
  getCreatorStats,
  getCreatorArticles,
  getCreatorEarnings,
  updateCreatorProfile,
  setArticlePaid
};
