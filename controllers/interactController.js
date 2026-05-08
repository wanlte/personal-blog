const prisma = require('../db/index');

// ==================== 文章点赞 ====================

// POST /api/articles/:id/like — 点赞
async function likeArticle(req, res) {
  const articleId = parseInt(req.params.id);
  const userId = req.user.userId;

  try {
    const existing = await prisma.articleLike.findUnique({
      where: { articleId_userId: { articleId, userId } }
    });
    if (existing) {
      return res.status(409).json({ error: '已赞过该文章', liked: true });
    }

    await prisma.articleLike.create({ data: { articleId, userId } });
    const count = await prisma.articleLike.count({ where: { articleId } });
    res.json({ liked: true, count });
  } catch (error) {
    console.error('点赞失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// DELETE /api/articles/:id/like — 取消点赞
async function unlikeArticle(req, res) {
  const articleId = parseInt(req.params.id);
  const userId = req.user.userId;

  try {
    const existing = await prisma.articleLike.findUnique({
      where: { articleId_userId: { articleId, userId } }
    });
    if (!existing) {
      return res.status(404).json({ error: '未点赞该文章' });
    }

    await prisma.articleLike.delete({ where: { id: existing.id } });
    const count = await prisma.articleLike.count({ where: { articleId } });
    res.json({ liked: false, count });
  } catch (error) {
    console.error('取消点赞失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// GET /api/user/likes — 我的点赞列表
async function getMyLikes(req, res) {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const [records, total] = await Promise.all([
      prisma.articleLike.findMany({
        where: { userId },
        include: {
          article: {
            select: { id: true, title: true, summary: true, views: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.articleLike.count({ where: { userId } })
    ]);

    res.json({
      articles: records.map(r => ({
        ...r.article,
        likedAt: r.createdAt
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('获取点赞列表失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// ==================== 文章收藏 ====================

// POST /api/articles/:id/collect — 收藏
async function collectArticle(req, res) {
  const articleId = parseInt(req.params.id);
  const userId = req.user.userId;

  try {
    const existing = await prisma.articleCollection.findUnique({
      where: { articleId_userId: { articleId, userId } }
    });
    if (existing) {
      return res.status(409).json({ error: '已收藏过该文章', collected: true });
    }

    await prisma.articleCollection.create({ data: { articleId, userId } });
    const count = await prisma.articleCollection.count({ where: { articleId } });
    res.json({ collected: true, count });
  } catch (error) {
    console.error('收藏失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// DELETE /api/articles/:id/collect — 取消收藏
async function uncollectArticle(req, res) {
  const articleId = parseInt(req.params.id);
  const userId = req.user.userId;

  try {
    const existing = await prisma.articleCollection.findUnique({
      where: { articleId_userId: { articleId, userId } }
    });
    if (!existing) {
      return res.status(404).json({ error: '未收藏该文章' });
    }

    await prisma.articleCollection.delete({ where: { id: existing.id } });
    const count = await prisma.articleCollection.count({ where: { articleId } });
    res.json({ collected: false, count });
  } catch (error) {
    console.error('取消收藏失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// GET /api/user/collections — 我的收藏列表
async function getMyCollections(req, res) {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const [records, total] = await Promise.all([
      prisma.articleCollection.findMany({
        where: { userId },
        include: {
          article: {
            select: { id: true, title: true, summary: true, views: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.articleCollection.count({ where: { userId } })
    ]);

    res.json({
      articles: records.map(r => ({
        ...r.article,
        collectedAt: r.createdAt
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('获取收藏列表失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// ==================== 用户关注 ====================

// POST /api/users/:id/follow — 关注
async function followUser(req, res) {
  const followingId = parseInt(req.params.id);
  const followerId = req.user.userId;

  if (followerId === followingId) {
    return res.status(400).json({ error: '不能关注自己' });
  }

  try {
    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } }
    });
    if (existing) {
      return res.status(409).json({ error: '已关注该用户', following: true });
    }

    await prisma.userFollow.create({ data: { followerId, followingId } });
    const count = await prisma.userFollow.count({ where: { followingId } });
    res.json({ following: true, count });
  } catch (error) {
    console.error('关注失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// DELETE /api/users/:id/follow — 取消关注
async function unfollowUser(req, res) {
  const followingId = parseInt(req.params.id);
  const followerId = req.user.userId;

  try {
    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } }
    });
    if (!existing) {
      return res.status(404).json({ error: '未关注该用户' });
    }

    await prisma.userFollow.delete({ where: { id: existing.id } });
    const count = await prisma.userFollow.count({ where: { followingId } });
    res.json({ following: false, count });
  } catch (error) {
    console.error('取消关注失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// GET /api/user/followers — 我的粉丝
async function getMyFollowers(req, res) {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const [records, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followingId: userId },
        include: {
          follower: { select: { id: true, username: true, createdAt: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.userFollow.count({ where: { followingId: userId } })
    ]);

    res.json({
      followers: records.map(r => ({
        id: r.follower.id,
        username: r.follower.username,
        followedAt: r.createdAt
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('获取粉丝列表失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// GET /api/user/following — 我关注的
async function getMyFollowing(req, res) {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  try {
    const [records, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followerId: userId },
        include: {
          following: { select: { id: true, username: true, createdAt: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.userFollow.count({ where: { followerId: userId } })
    ]);

    res.json({
      following: records.map(r => ({
        id: r.following.id,
        username: r.following.username,
        followedAt: r.createdAt
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('获取关注列表失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// ==================== 状态查询（供前端详情页用） ====================

// GET /api/articles/:id/interaction — 获取文章互动状态（点赞/收藏/关注）
async function getArticleInteraction(req, res) {
  const articleId = parseInt(req.params.id);
  const userId = req.user?.userId;

  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        _count: { select: { likes: true, collections: true } },
        user: { select: { id: true } }
      }
    });
    if (!article) return res.status(404).json({ error: '文章不存在' });

    const result = {
      likeCount: article._count.likes,
      collectCount: article._count.collections,
      liked: false,
      collected: false,
      followingAuthor: false,
      authorFollowerCount: 0
    };

    if (userId) {
      const [like, collect, follow] = await Promise.all([
        prisma.articleLike.findUnique({
          where: { articleId_userId: { articleId, userId } }
        }),
        prisma.articleCollection.findUnique({
          where: { articleId_userId: { articleId, userId } }
        }),
        article.user?.id && userId !== article.user.id
          ? prisma.userFollow.findUnique({
              where: { followerId_followingId: { followerId: userId, followingId: article.user.id } }
            })
          : Promise.resolve(null)
      ]);
      result.liked = !!like;
      result.collected = !!collect;
      result.followingAuthor = !!follow;
    }

    if (article.user) {
      result.authorFollowerCount = await prisma.userFollow.count({
        where: { followingId: article.user.id }
      });
    }

    res.json(result);
  } catch (error) {
    console.error('获取互动状态失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// ==================== 原有的辅助接口（保留兼容） ====================

// GET /api/users/:id — 用户信息
async function getUserProfile(req, res) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: { select: { articles: true, followers: true, following: true } },
        creatorProfile: true
      }
    });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    res.json({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      articleCount: user._count.articles,
      followerCount: user._count.followers,
      followingCount: user._count.following,
      bio: user.creatorProfile?.bio || null,
      avatar: user.creatorProfile?.avatar || null,
      isVerified: user.creatorProfile?.isVerified || false
    });
  } catch (error) {
    console.error('获取用户信息失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// GET /api/authors/popular — 热门作者
async function getPopularAuthors(req, res) {
  try {
    const authors = await prisma.user.findMany({
      where: { articles: { some: { status: 'published' } } },
      include: {
        _count: { select: { articles: { where: { status: 'published' } }, followers: true } },
        creatorProfile: { select: { bio: true, avatar: true, isVerified: true } }
      },
      orderBy: { followers: { _count: 'desc' } },
      take: 5
    });

    res.json(authors.map(a => ({
      id: a.id,
      username: a.username,
      articleCount: a._count.articles,
      followerCount: a._count.followers,
      bio: a.creatorProfile?.bio || null,
      avatar: a.creatorProfile?.avatar || null,
      isVerified: a.creatorProfile?.isVerified || false
    })));
  } catch (error) {
    console.error('获取热门作者失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

// ==================== 付费文章购买（保留兼容） ====================

async function purchaseArticle(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const article = await prisma.article.findUnique({ where: { id: parseInt(id) } });
    if (!article) return res.status(404).json({ error: '文章不存在' });
    if (!article.isPaid) return res.status(400).json({ error: '该文章无需购买' });

    const existing = await prisma.articlePurchase.findUnique({
      where: { articleId_userId: { articleId: parseInt(id), userId } }
    });
    if (existing) return res.json({ purchased: true, message: '已购买过该文章' });

    await prisma.articlePurchase.create({
      data: { articleId: parseInt(id), userId, amount: article.price || 0 }
    });

    res.json({ purchased: true, message: '购买成功' });
  } catch (error) {
    console.error('购买文章失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

async function checkAccess(req, res) {
  const { id } = req.params;
  const userId = req.user?.userId;
  const articleId = parseInt(id);

  try {
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article) return res.status(404).json({ error: '文章不存在' });
    if (!article.isPaid) return res.json({ isPaid: false, hasAccess: true });

    let hasAccess = false;
    if (userId) {
      if (article.userId === userId) {
        hasAccess = true;
      } else {
        const purchase = await prisma.articlePurchase.findUnique({
          where: { articleId_userId: { articleId, userId } }
        });
        hasAccess = !!purchase;
      }
    }
    res.json({ isPaid: true, price: Number(article.price), hasAccess, canPurchase: !!userId });
  } catch (error) {
    console.error('检查文章访问权限失败:', error.message);
    res.status(500).json({ error: '服务器错误' });
  }
}

module.exports = {
  likeArticle, unlikeArticle, getMyLikes,
  collectArticle, uncollectArticle, getMyCollections,
  followUser, unfollowUser, getMyFollowers, getMyFollowing,
  getArticleInteraction, getUserProfile, getPopularAuthors,
  purchaseArticle, checkAccess
};
