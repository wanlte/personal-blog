// controllers/articlesController.js - 文章控制器
const db = require('../db/db');

// 获取所有已发布的文章列表
function getArticles(req, res) {
    const tagName = req.query.tag;
    
    let sql;
    let params = [];
    
    if (tagName) {
        sql = `
            SELECT a.*, u.username as author_name 
            FROM articles a
            LEFT JOIN users u ON a.user_id = u.id 
            LEFT JOIN article_tags at ON a.id = at.article_id
            LEFT JOIN tags t ON at.tag_id = t.id
            WHERE t.name = ? AND a.status = 'published'
            ORDER BY a.is_pinned DESC, a.created_at DESC
        `;
        params = [tagName];
    } else {
        sql = `
            SELECT a.*, u.username as author_name 
            FROM articles a
            LEFT JOIN users u ON a.user_id = u.id 
            WHERE a.status = 'published'
            ORDER BY a.is_pinned DESC, a.created_at DESC
        `;
    }
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('查询失败:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
}

// 获取单篇文章
function getArticle(req, res) {
    const { id } = req.params;
    
    const selectSql = `
        SELECT articles.*, users.username as author_name 
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        WHERE articles.id = ?
    `;
    
    db.get(selectSql, [id], (err, row) => {
        if (err) {
            console.error('查询失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        // 增加浏览量
        const updateSql = `UPDATE articles SET views = views + 1 WHERE id = ?`;
        db.run(updateSql, [id], (updateErr) => {
            if (updateErr) {
                console.error('更新浏览量失败:', updateErr.message);
            }
            res.json(row);
        });
    });
}

// 创建新文章
function createArticle(req, res) {
    const { title, content, summary } = req.body;
    const userId = req.user.userId;
    
    if (!title) {
        res.status(400).json({ error: '标题不能为空' });
        return;
    }
    
    const sql = `INSERT INTO articles (title, content, summary, user_id, status) VALUES (?, ?, ?, ?, 'published')`;
    
    db.run(sql, [title, content || '', summary || '', userId], function(err) {
        if (err) {
            console.error('创建失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        res.json({
            id: this.lastID,
            title,
            content: content || '',
            summary: summary || '',
            views: 0,
            message: '文章创建成功'
        });
    });
}

// 更新文章
function updateArticle(req, res) {
    const { id } = req.params;
    const { title, content, summary } = req.body;
    const userId = req.user.userId;
    
    if (!title) {
        res.status(400).json({ error: '标题不能为空' });
        return;
    }
    
    // 先检查文章是否属于当前用户
    const checkSql = `SELECT user_id FROM articles WHERE id = ?`;
    db.get(checkSql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        if (row.user_id !== userId) {
            res.status(403).json({ error: '无权修改此文章' });
            return;
        }
        
        // 更新文章
        const sql = `UPDATE articles 
                     SET title = ?, content = ?, summary = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        
        db.run(sql, [title, content || '', summary || '', id], function(err) {
            if (err) {
                console.error('更新失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            
            res.json({ message: '文章更新成功', id: parseInt(id) });
        });
    });
}

// 删除文章
function deleteArticle(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const checkSql = `SELECT user_id FROM articles WHERE id = ?`;
    db.get(checkSql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        if (row.user_id !== userId) {
            res.status(403).json({ error: '无权删除此文章' });
            return;
        }
        
        const sql = `DELETE FROM articles WHERE id = ?`;
        db.run(sql, [id], function(err) {
            if (err) {
                console.error('删除失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            
            res.json({ message: '文章删除成功', id: parseInt(id) });
        });
    });
}

// 置顶文章
function pinArticle(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // 先检查文章是否属于当前用户
    const checkSql = `SELECT user_id, is_pinned FROM articles WHERE id = ?`;
    db.get(checkSql, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        if (!row) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        
        if (row.user_id !== userId) {
            res.status(403).json({ error: '无权操作此文章' });
            return;
        }
        
        const newPinStatus = row.is_pinned === 1 ? 0 : 1;
        const sql = `UPDATE articles SET is_pinned = ? WHERE id = ?`;
        
        db.run(sql, [newPinStatus, id], function(err) {
            if (err) {
                console.error('置顶操作失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            
            res.json({ 
                message: newPinStatus === 1 ? '文章已置顶' : '已取消置顶',
                is_pinned: newPinStatus
            });
        });
    });
}

// 保存草稿
function saveDraft(req, res) {
    const { title, content, summary, tags } = req.body;
    const userId = req.user.userId;
    
    const sql = `INSERT INTO articles (title, content, summary, user_id, status) 
                 VALUES (?, ?, ?, ?, 'draft')`;
    
    db.run(sql, [title || '无标题', content || '', summary || '', userId], function(err) {
        if (err) {
            console.error('保存草稿失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        const articleId = this.lastID;
        
        // 保存标签
        if (tags) {
            const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
            for (const tagName of tagList) {
                db.get(`SELECT id FROM tags WHERE name = ?`, [tagName], (err, tag) => {
                    if (tag) {
                        db.run(`INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)`, [articleId, tag.id]);
                    } else {
                        db.run(`INSERT INTO tags (name) VALUES (?)`, [tagName], function(err) {
                            if (!err) {
                                db.run(`INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)`, [articleId, this.lastID]);
                            }
                        });
                    }
                });
            }
        }
        
        res.json({ id: articleId, message: '草稿已保存' });
    });
}

// 获取草稿列表
function getDrafts(req, res) {
    const userId = req.user.userId;
    
    const sql = `
        SELECT * FROM articles 
        WHERE user_id = ? AND status = 'draft'
        ORDER BY updated_at DESC
    `;
    
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error('获取草稿失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
}

// 发布草稿
function publishDraft(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // 验证文章属于当前用户
    db.get(`SELECT user_id FROM articles WHERE id = ?`, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        if (!row) {
            res.status(404).json({ error: '文章不存在' });
            return;
        }
        if (row.user_id !== userId) {
            res.status(403).json({ error: '无权操作' });
            return;
        }
        
        const sql = `UPDATE articles SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        db.run(sql, [id], function(err) {
            if (err) {
                console.error('发布失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            res.json({ message: '发布成功' });
        });
    });
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
