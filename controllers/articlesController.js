// controllers/articlesController.js - 文章控制器
const prisma = require('../db/index');

// 获取所有已发布的文章列表
async function getArticles(req, res) {
    const tagName = req.query.tag;
    
    try {
        if (tagName) {
            const articles = await prisma.article.findMany({
                where: {
                    status: 'published',
                    tags: {
                        some: {
                            tag: {
                                name: tagName
                            }
                        }
                    }
                },
                include: {
                    user: {
                        select: { username: true }
                    }
                },
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
            res.json(articles);
        } else {
            const articles = await prisma.article.findMany({
                where: { status: 'published' },
                include: {
                    user: {
                        select: { username: true }
                    }
                },
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' }
                ]
            });
            res.json(articles);
        }
    } catch (error) {
        console.error('查询失败:', error.message);
        res.status(500).json({ error: error.message });
    }
}

// 获取单篇文章
async function getArticle(req, res) {
    const { id } = req.params;
    
    try {
        const article = await prisma.article.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    select: { username: true }
                }
            }
        });
        
        if (!article) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        // 增加浏览量
        await prisma.article.update({
            where: { id: parseInt(id) },
            data: { views: { increment: 1 } }
        });
        
        res.json(article);
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
        
        res.json({ message: '文章更新成功', id: parseInt(id) });
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
        
        res.json({ message: '文章删除成功', id: parseInt(id) });
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
        
        res.json({ 
            message: newPinStatus === 1 ? '文章已置顶' : '已取消置顶',
            is_pinned: newPinStatus
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
        
        // 保存标签
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
            where: {
                userId,
                status: 'draft'
            },
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
