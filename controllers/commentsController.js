// controllers/commentsController.js - 评论控制器
const jwt = require('jsonwebtoken');
const prisma = require('../db/index');
const { JWT_SECRET } = require('../middleware/auth');

// 发表评论
async function createComment(req, res) {
    const { id } = req.params;
    const { content, userName } = req.body;
    
    if (!content || content.trim() === '') {
        res.status(400).json({ error: '评论内容不能为空' });
        return;
    }
    
    try {
        // 检查文章是否存在
        const article = await prisma.article.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!article) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        // 获取当前登录用户
        const token = req.headers.authorization?.split(' ')[1];
        let userId = null;
        let finalUserName = userName || '匿名';
        
        if (token) {
            try {
                const decoded = jwt.decode(token);
                userId = decoded?.userId;
                finalUserName = decoded?.username || finalUserName;
            } catch (e) {
                console.error('解析token失败', e);
            }
        }
        
        const comment = await prisma.comment.create({
            data: {
                content: content.trim(),
                articleId: parseInt(id),
                userId,
                userName: finalUserName
            }
        });
        
        res.json({
            id: comment.id,
            content: comment.content,
            user_name: comment.userName,
            created_at: comment.createdAt
        });
    } catch (error) {
        console.error('发表评论失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 获取文章评论
async function getComments(req, res) {
    const { id } = req.params;
    
    try {
        const comments = await prisma.comment.findMany({
            where: { articleId: parseInt(id) },
            include: {
                user: {
                    select: { username: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        
        const result = comments.map(c => ({
            ...c,
            user_avatar: c.user?.username
        }));
        
        res.json(result);
    } catch (error) {
        console.error('获取评论失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

// 删除评论
async function deleteComment(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    try {
        const comment = await prisma.comment.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!comment) {
            res.status(404).json({ error: '评论不存在' });
            return;
        }
        
        if (comment.userId !== userId) {
            res.status(403).json({ error: '无权删除此评论' });
            return;
        }
        
        await prisma.comment.delete({
            where: { id: parseInt(id) }
        });
        
        res.json({ message: '评论删除成功' });
    } catch (error) {
        console.error('删除评论失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
    }
}

module.exports = {
    createComment,
    getComments,
    deleteComment
};
