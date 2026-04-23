// controllers/commentsController.js - 评论控制器
const db = require('../db/db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// 发表评论
function createComment(req, res) {
    const { id } = req.params;
    const { content, userName } = req.body;
    
    if (!content || content.trim() === '') {
        res.status(400).json({ error: '评论内容不能为空' });
        return;
    }
    
    // 检查文章是否存在
    db.get(`SELECT id FROM articles WHERE id = ?`, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        if (!row) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        // 获取当前登录用户
        const token = req.headers.authorization?.split(' ')[1];
        let userId = null;
        let finalUserName = userName || '匿名';
        
        if (token) {
            try {
                const payload = jwt.decode(token);
                userId = payload.userId;
                finalUserName = payload.username;
            } catch (e) {
                console.error('解析token失败', e);
            }
        }
        
        const sql = `INSERT INTO comments (content, article_id, user_id, user_name) VALUES (?, ?, ?, ?)`;
        db.run(sql, [content.trim(), id, userId, finalUserName], function(err) {
            if (err) {
                console.error('发表评论失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            res.json({
                id: this.lastID,
                content: content.trim(),
                user_name: finalUserName,
                created_at: new Date().toISOString()
            });
        });
    });
}

// 获取文章评论
function getComments(req, res) {
    const { id } = req.params;
    
    const sql = `
        SELECT comments.*, users.username as user_avatar 
        FROM comments 
        LEFT JOIN users ON comments.user_id = users.id 
        WHERE comments.article_id = ? 
        ORDER BY comments.created_at ASC
    `;
    
    db.all(sql, [id], (err, rows) => {
        if (err) {
            console.error('获取评论失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
}

// 删除评论
function deleteComment(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const checkSql = `SELECT user_id FROM comments WHERE id = ?`;
    db.get(checkSql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        if (!row) {
            res.status(404).json({ error: '评论不存在' });
            return;
        }
        if (row.user_id !== userId) {
            res.status(403).json({ error: '无权删除此评论' });
            return;
        }
        
        db.run(`DELETE FROM comments WHERE id = ?`, [id], function(err) {
            if (err) {
                console.error('删除评论失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            res.json({ message: '评论删除成功' });
        });
    });
}

module.exports = {
    createComment,
    getComments,
    deleteComment
};
