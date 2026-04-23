// controllers/tagsController.js - 标签控制器
const db = require('../db/db');

// 获取所有标签
function getTags(req, res) {
    const sql = `SELECT * FROM tags ORDER BY name ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('获取标签失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
}

// 创建标签
function createTag(req, res) {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
        res.status(400).json({ error: '标签名不能为空' });
        return;
    }
    
    const sql = `INSERT INTO tags (name) VALUES (?)`;
    db.run(sql, [name.trim()], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                res.status(400).json({ error: '标签已存在' });
            } else {
                console.error('创建标签失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
            }
            return;
        }
        res.json({ id: this.lastID, name: name.trim() });
    });
}

// 给文章添加标签
function addTagToArticle(req, res) {
    const { id } = req.params;
    const { tagName } = req.body;
    const userId = req.user.userId;
    
    // 先验证文章是否属于当前用户
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
            res.status(403).json({ error: '无权操作此文章' });
            return;
        }
        
        // 查找或创建标签
        db.get(`SELECT id FROM tags WHERE name = ?`, [tagName], (err, tag) => {
            if (err) {
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            
            const createTagRelation = (tagId) => {
                db.run(`INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)`, [id, tagId], (err) => {
                    if (err) {
                        if (err.message.includes('UNIQUE')) {
                            res.status(400).json({ error: '标签已关联' });
                        } else {
                            res.status(500).json({ error: '服务器错误' });
                        }
                        return;
                    }
                    res.json({ message: '标签添加成功' });
                });
            };
            
            if (tag) {
                createTagRelation(tag.id);
            } else {
                db.run(`INSERT INTO tags (name) VALUES (?)`, [tagName], function(err) {
                    if (err) {
                        res.status(500).json({ error: '创建标签失败' });
                        return;
                    }
                    createTagRelation(this.lastID);
                });
            }
        });
    });
}

// 获取文章的所有标签
function getArticleTags(req, res) {
    const { id } = req.params;
    
    const sql = `
        SELECT tags.* FROM tags 
        JOIN article_tags ON tags.id = article_tags.tag_id 
        WHERE article_tags.article_id = ?
        ORDER BY tags.name ASC
    `;
    db.all(sql, [id], (err, rows) => {
        if (err) {
            console.error('获取文章标签失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
}

// 删除文章标签
function deleteArticleTag(req, res) {
    const { id, tagId } = req.params;
    const userId = req.user.userId;
    
    // 验证文章权限
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
            res.status(403).json({ error: '无权操作此文章' });
            return;
        }
        
        db.run(`DELETE FROM article_tags WHERE article_id = ? AND tag_id = ?`, [id, tagId], function(err) {
            if (err) {
                console.error('删除标签失败:', err.message);
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            res.json({ message: '标签删除成功' });
        });
    });
}

module.exports = {
    getTags,
    createTag,
    addTagToArticle,
    getArticleTags,
    deleteArticleTag
};
