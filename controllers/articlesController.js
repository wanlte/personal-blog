const prisma = require('../db/index');
const { clearArticleCache } = require('../middleware/cache');

// 获取所有已发布的文章列表（包含当前用户的互动状态）
async function getArticles(req, res) {
    const tagName = req.query.tag;
    const userId = req.user?.userId; // 来自 optionalAuth

    try {
        const where = { status: 'published' };
        if (tagName) {
            where.tags = { some: { tag: { name: tagName } } };
        }

        const articles = await prisma.article.findMany({
            where,
            include: {
                user: { select: { username: true } },
                _count: { select: { likes: true, collections: true } }
            },
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        // 如果用户已登录，查询其点赞/收藏状态
        let userLikes = new Set();
        let userCollections = new Set();
        if (userId) {
            const articleIds = articles.map(a => a.id);
            const [likes, collections] = await Promise.all([
                prisma.articleLike.findMany({
                    where: { userId, articleId: { in: articleIds } },
                    select: { articleId: true }
                }),
                prisma.articleCollection.findMany({
                    where: { userId, articleId: { in: articleIds } },
                    select: { articleId: true }
                })
            ]);
            likes.forEach(l => userLikes.add(l.articleId));
            collections.forEach(c => userCollections.add(c.articleId));
        }

        const result = articles.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            summary: a.summary,
            user_id: a.userId,
            author_name: a.user?.username || '匿名',
            views: a.views,
            status: a.status,
            is_pinned: a.isPinned,
            is_paid: a.isPaid,
            price: a.price ? Number(a.price) : 0,
            like_count: a._count.likes,
            collect_count: a._count.collections,
            is_liked: userLikes.has(a.id),
            is_collected: userCollections.has(a.id),
            created_at: a.createdAt,
            updated_at: a.updatedAt
        }));

        res.json(result);
    } catch (error) {
        console.error('查询失败:', error.message);
        res.status(500).json({ error: error.message });
    }
}

// 获取单篇文章（包含互动数据）
async function getArticle(req, res) {
    const { id } = req.params;
    const userId = req.user?.userId;

    try {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: { select: { id: true, username: true } },
                _count: { select: { likes: true, collections: true } }
            }
        });

        if (!article) {
            return res.status(404).json({ error: '文章不存在' });
        }

        // 增加浏览量
        await prisma.article.update({
            where: { id: parseInt(id) },
            data: { views: { increment: 1 } }
        });

        // 查询互动状态
        let isLiked = false, isCollected = false, isFollowingAuthor = false;
        let authorFollowerCount = 0;

        if (article.user) {
            authorFollowerCount = await prisma.userFollow.count({
                where: { followingId: article.user.id }
            });
        }

        if (userId) {
            const [like, collect, follow] = await Promise.all([
                prisma.articleLike.findUnique({
                    where: { articleId_userId: { articleId: parseInt(id), userId } }
                }),
                prisma.articleCollection.findUnique({
                    where: { articleId_userId: { articleId: parseInt(id), userId } }
                }),
                article.user && userId !== article.user.id
                    ? prisma.userFollow.findUnique({
                        where: { followerId_followingId: { followerId: userId, followingId: article.user.id } }
                      })
                    : Promise.resolve(null)
            ]);
            isLiked = !!like;
            isCollected = !!collect;
            isFollowingAuthor = !!follow;
        }

        const result = {
            id: article.id,
            title: article.title,
            content: article.content,
            summary: article.summary,
            user_id: article.userId,
            author_name: article.user?.username || '匿名',
            author_id: article.user?.id || null,
            views: article.views + 1, // +1 因为上面已经增加了
            status: article.status,
            is_pinned: article.isPinned,
            is_paid: article.isPaid,
            price: article.price ? Number(article.price) : 0,
            tags: [],
            // 互动数据
            like_count: article._count.likes,
            collect_count: article._count.collections,
            author_follower_count: authorFollowerCount,
            is_liked: isLiked,
            is_collected: isCollected,
            is_following_author: isFollowingAuthor,
            created_at: article.createdAt,
            updated_at: article.updatedAt
        };

        res.json(result);
    } catch (error) {
        console.error('查询失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 创建新文章
async function createArticle(req, res) {
    const { title, content, summary } = req.body;
    const userId = req.user.userId;

    if (!title) {
        res.status(400).json({ error: '标题不能为空' });
        return;
    }

    try {
        const article = await prisma.article.create({
            data: {
                title,
                content: content || '',
                summary: summary || '',
                userId,
                status: 'published'
            }
        });

        res.json({
            id: article.id,
            title: article.title,
            content: article.content || '',
            summary: article.summary || '',
            views: 0,
            message: '文章创建成功'
        });

        req.audit?.log({
          action: 'ARTICLE_CREATE',
          resourceType: 'article',
          resourceId: article.id,
          newValue: { title, summary: summary || '', status: 'published' },
        });
    } catch (error) {
        console.error('创建失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 更新文章
async function updateArticle(req, res) {
    const { id } = req.params;
    const { title, content, summary } = req.body;
    const userId = req.user.userId;

    if (!title) {
        res.status(400).json({ error: '标题不能为空' });
        return;
    }

    try {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(id) }
        });

        if (!article) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }

        if (article.userId !== userId) {
            res.status(403).json({ error: '无权修改此文章' });
            return;
        }

        await prisma.article.update({
            where: { id: parseInt(id) },
            data: {
                title,
                content: content || '',
                summary: summary || ''
            }
        });

        await clearArticleCache(parseInt(id));

        res.json({ message: '文章更新成功', id: parseInt(id) });

        req.audit?.log({
          action: 'ARTICLE_UPDATE',
          resourceType: 'article',
          resourceId: parseInt(id),
          oldValue: { title: article.title, summary: article.summary, status: article.status },
          newValue: { title, summary: summary || '' },
        });
    } catch (error) {
        console.error('更新失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 删除文章
async function deleteArticle(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(id) }
        });

        if (!article) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }

        if (article.userId !== userId) {
            res.status(403).json({ error: '无权删除此文章' });
            return;
        }

        await prisma.article.delete({
            where: { id: parseInt(id) }
        });

        await clearArticleCache(parseInt(id));

        res.json({ message: '文章删除成功', id: parseInt(id) });

        req.audit?.log({
          action: 'ARTICLE_DELETE',
          resourceType: 'article',
          resourceId: parseInt(id),
          oldValue: { title: article.title, status: article.status },
        });
    } catch (error) {
        console.error('删除失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 置顶文章
async function pinArticle(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(id) }
        });

        if (!article) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }

        if (article.userId !== userId) {
            res.status(403).json({ error: '无权操作此文章' });
            return;
        }

        const newPinStatus = article.isPinned === 1 ? 0 : 1;
        await prisma.article.update({
            where: { id: parseInt(id) },
            data: { isPinned: newPinStatus }
        });

        await clearArticleCache(parseInt(id));

        res.json({
            message: newPinStatus === 1 ? '文章已置顶' : '已取消置顶',
            is_pinned: newPinStatus
        });

        req.audit?.log({
          action: 'ARTICLE_PIN',
          resourceType: 'article',
          resourceId: parseInt(id),
          oldValue: { isPinned: article.isPinned },
          newValue: { isPinned: newPinStatus },
        });
    } catch (error) {
        console.error('置顶操作失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 保存草稿
async function saveDraft(req, res) {
    const { title, content, summary, tags } = req.body;
    const userId = req.user.userId;

    try {
        const article = await prisma.article.create({
            data: {
                title: title || '无标题',
                content: content || '',
                summary: summary || '',
                userId,
                status: 'draft'
            }
        });

        if (tags) {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
            for (const tagName of tagList) {
                let tag = await prisma.tag.findUnique({ where: { name: tagName } });
                if (!tag) {
                    tag = await prisma.tag.create({ data: { name: tagName } });
                }
                await prisma.articleTag.create({
                    data: { articleId: article.id, tagId: tag.id }
                });
            }
        }

        res.json({ id: article.id, message: '草稿已保存' });

        req.audit?.log({
          action: 'ARTICLE_DRAFT_SAVE',
          resourceType: 'article',
          resourceId: article.id,
          newValue: { title: title || '无标题', summary: summary || '' },
        });
    } catch (error) {
        console.error('保存草稿失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取草稿列表
async function getDrafts(req, res) {
    const userId = req.user.userId;

    try {
        const drafts = await prisma.article.findMany({
            where: { userId, status: 'draft' },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(drafts);
    } catch (error) {
        console.error('获取草稿失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 发布草稿
async function publishDraft(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(id) }
        });

        if (!article) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }

        if (article.userId !== userId) {
            res.status(403).json({ error: '无权操作' });
            return;
        }

        await prisma.article.update({
            where: { id: parseInt(id) },
            data: { status: 'published' }
        });

        res.json({ message: '发布成功' });

        req.audit?.log({
          action: 'ARTICLE_DRAFT_PUBLISH',
          resourceType: 'article',
          resourceId: parseInt(id),
          oldValue: { status: article.status },
          newValue: { status: 'published' },
        });
    } catch (error) {
        console.error('发布失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

module.exports = {
    getArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    pinArticle,
    saveDraft,
    getDrafts,
    publishDraft
};
