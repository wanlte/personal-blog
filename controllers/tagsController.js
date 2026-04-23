// controllers/tagsController.js - 标签控制器
const prisma = require('../db/index');

// 获取所有标签
async function getTags(req, res) {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(tags);
    } catch (error) {
        console.error('获取标签失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 创建标签
async function createTag(req, res) {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
        res.status(400).json({ error: '标签名不能为空' });
        return;
    }
    
    try {
        const tag = await prisma.tag.create({
            data: { name: name.trim() }
        });
        res.json({ id: tag.id, name: tag.name });
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: '标签已存在' });
        } else {
            console.error('创建标签失败:', error.message);
            res.status(500).json({ error: '服务器错误' });
        }
    }
}

// 给文章添加标签
async function addTagToArticle(req, res) {
    const { id } = req.params;
    const { tagName } = req.body;
    const userId = req.user.userId;
    
    try {
        // 验证文章权限
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
        
        // 查找或创建标签
        let tag = await prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
            tag = await prisma.tag.create({ data: { name: tagName } });
        }
        
        // 关联
        await prisma.articleTag.create({
            data: { articleId: parseInt(id), tagId: tag.id }
        });
        
        res.json({ message: '标签添加成功' });
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400).json({ error: '标签已关联' });
        } else {
            console.error('添加标签失败:', error.message);
            res.status(500).json({ error: '服务器错误' });
        }
    }
}

// 获取文章的所有标签
async function getArticleTags(req, res) {
    const { id } = req.params;
    
    try {
        const articleTags = await prisma.articleTag.findMany({
            where: { articleId: parseInt(id) },
            include: { tag: true },
            orderBy: { tag: { name: 'asc' } }
        });
        
        const tags = articleTags.map(at => at.tag);
        res.json(tags);
    } catch (error) {
        console.error('获取文章标签失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 删除文章标签
async function deleteArticleTag(req, res) {
    const { id, tagId } = req.params;
    const userId = req.user.userId;
    
    try {
        // 验证文章权限
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
        
        await prisma.articleTag.delete({
            where: {
                articleId_tagId: {
                    articleId: parseInt(id),
                    tagId: parseInt(tagId)
                }
            }
        });
        
        res.json({ message: '标签删除成功' });
    } catch (error) {
        console.error('删除标签失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

module.exports = {
    getTags,
    createTag,
    addTagToArticle,
    getArticleTags,
    deleteArticleTag
};
