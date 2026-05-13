// controllers/commentsController.js - 评论控制器
const jwt = require('jsonwebtoken');
const prisma = require('../db/index');
const { JWT_SECRET } = require('../middleware/auth');
const { emitToArticle, emitToAdmin } = require('../utils/websocket');

// 发表评论（支持嵌套回复）
async function createComment(req, res) {
    const { id } = req.params;
    const { content, userName, parentId } = req.body;

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

        // 如果指定了 parentId，检查父评论是否存在
        if (parentId) {
            const parentComment = await prisma.comment.findUnique({
                where: { id: parseInt(parentId) }
            });
            if (!parentComment) {
                res.status(404).json({ error: '父评论不存在' });
                return;
            }
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
                userName: finalUserName,
                parentId: parentId ? parseInt(parentId) : null
            }
        });

        const commentData = {
            id: comment.id,
            content: comment.content,
            user_name: comment.userName,
            parent_id: comment.parentId,
            created_at: comment.createdAt,
        };

        res.json(commentData);

        // 实时通知：推送给同一文章房间的所有用户
        emitToArticle(parseInt(id), 'comment:new', commentData);
        emitToAdmin('stats:update');

        req.audit?.log({
          userId: userId || undefined,
          action: 'COMMENT_CREATE',
          resourceType: 'comment',
          resourceId: comment.id,
          newValue: { content: comment.content, articleId: parseInt(id), parentId: parentId ? parseInt(parentId) : null },
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
            id: c.id,
            content: c.content,
            article_id: c.articleId,
            user_id: c.userId,
            user_name: c.userName,
            parent_id: c.parentId,
            created_at: c.createdAt,
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

        // 实时通知
        emitToArticle(comment.articleId, 'comment:deleted', { id: parseInt(id) });
        emitToAdmin('stats:update');

        req.audit?.log({
          action: 'COMMENT_DELETE',
          resourceType: 'comment',
          resourceId: parseInt(id),
          oldValue: { content: comment.content, articleId: comment.articleId },
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
