const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'db', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// JWT 密钥
const JWT_SECRET = 'your-secret-key-2024';

// ==================== 用户认证 API ====================

// POST /api/register - 用户注册
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        res.status(400).json({ error: '用户名和密码不能为空' });
        return;
    }
    
    if (password.length < 6) {
        res.status(400).json({ error: '密码长度不能少于6位' });
        return;
    }
    
    try {
        // 检查用户是否已存在
        const checkSql = `SELECT id FROM users WHERE username = ?`;
        db.get(checkSql, [username], async (err, row) => {
            if (err) {
                res.status(500).json({ error: '服务器错误' });
                return;
            }
            
            if (row) {
                res.status(400).json({ error: '用户名已存在' });
                return;
            }
            
            // 加密密码
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // 插入新用户
            const insertSql = `INSERT INTO users (username, password) VALUES (?, ?)`;
            db.run(insertSql, [username, hashedPassword], function(err) {
                if (err) {
                    console.error('注册失败:', err.message);
                    res.status(500).json({ error: '注册失败' });
                    return;
                }
                
                res.json({ 
                    message: '注册成功', 
                    userId: this.lastID 
                });
            });
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// POST /api/login - 用户登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        res.status(400).json({ error: '用户名和密码不能为空' });
        return;
    }
    
    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [username], async (err, user) => {
        if (err) {
            console.error('登录失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        
        if (!user) {
            res.status(401).json({ error: '用户名或密码错误' });
            return;
        }
        
        // 验证密码
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            res.status(401).json({ error: '用户名或密码错误' });
            return;
        }
        
        // 生成 JWT Token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            message: '登录成功',
            token: token,
            user: {
                id: user.id,
                username: user.username
            }
        });
    });
});

// 认证中间件（用于需要登录的接口）
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        res.status(401).json({ error: '请先登录' });
        return;
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.status(403).json({ error: '登录已过期，请重新登录' });
            return;
        }
        req.user = user;
        next();
    });
}


// GET - 获取所有文章
// GET - 获取所有文章（关联作者信息）
app.get('/api/articles', (req, res) => {
    const sql = `
        SELECT articles.*, users.username as author_name 
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        ORDER BY articles.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('查询失败:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET - 获取单篇文章（关联作者信息）
app.get('/api/articles/:id', (req, res) => {
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
});

// POST - 创建新文章
app.post('/api/articles', authenticateToken, (req, res) => {
    const { title, content, summary } = req.body;
    const userId = req.user.userId;
    
    if (!title) {
        res.status(400).json({ error: '标题不能为空' });
        return;
    }
    
    const sql = `INSERT INTO articles (title, content, summary, user_id) VALUES (?, ?, ?, ?)`;
    
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
});

// PUT - 更新文章（只能更新自己的）
app.put('/api/articles/:id', authenticateToken, (req, res) => {
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
});

// DELETE - 删除文章（只能删除自己的）
app.delete('/api/articles/:id', authenticateToken, (req, res) => {
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
});

// ==================== 标签 API ====================

// POST /api/tags - 创建标签
app.post('/api/tags', authenticateToken, (req, res) => {
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
});

// GET /api/tags - 获取所有标签
app.get('/api/tags', (req, res) => {
    const sql = `SELECT * FROM tags ORDER BY name ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('获取标签失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
});

// POST /api/articles/:id/tags - 给文章添加标签
app.post('/api/articles/:id/tags', authenticateToken, (req, res) => {
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
            
            const createTag = (tagId) => {
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
                createTag(tag.id);
            } else {
                db.run(`INSERT INTO tags (name) VALUES (?)`, [tagName], function(err) {
                    if (err) {
                        res.status(500).json({ error: '创建标签失败' });
                        return;
                    }
                    createTag(this.lastID);
                });
            }
        });
    });
});

// GET /api/articles/:id/tags - 获取文章的所有标签
app.get('/api/articles/:id/tags', (req, res) => {
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
});

// DELETE /api/articles/:id/tags/:tagId - 删除文章标签
app.delete('/api/articles/:id/tags/:tagId', authenticateToken, (req, res) => {
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
});


// ==================== 评论 API ====================

// POST /api/articles/:id/comments - 发表评论
app.post('/api/articles/:id/comments', (req, res) => {
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
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                userId = payload.userId;
                // 如果登录了，使用登录用户名
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
});

// GET /api/articles/:id/comments - 获取文章评论
app.get('/api/articles/:id/comments', (req, res) => {
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
});

// DELETE /api/comments/:id - 删除评论（只能删除自己的）
app.delete('/api/comments/:id', authenticateToken, (req, res) => {
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
});

// ==================== 搜索 API ====================

// GET /api/search?q=关键词 - 搜索文章
app.get('/api/search', (req, res) => {
    const keyword = req.query.q;
    
    if (!keyword || keyword.trim() === '') {
        res.status(400).json({ error: '搜索关键词不能为空' });
        return;
    }
    
    const searchTerm = `%${keyword.trim()}%`;
    const sql = `
        SELECT articles.*, users.username as author_name 
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        WHERE articles.title LIKE ? OR articles.content LIKE ? OR articles.summary LIKE ?
        ORDER BY articles.created_at DESC
    `;
    
    db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
            console.error('搜索失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
});

// ==================== 排行榜 API ====================

// GET /api/popular - 获取热门文章（按阅读量排序）
app.get('/api/popular', (req, res) => {
    const limit = parseInt(req.query.limit) || 5;  // 默认前5名
    
    const sql = `
        SELECT articles.id, articles.title, articles.summary, articles.views, 
               articles.created_at, users.username as author_name
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        WHERE articles.views > 0
        ORDER BY articles.views DESC
        LIMIT ?
    `;
    
    db.all(sql, [limit], (err, rows) => {
        if (err) {
            console.error('获取排行榜失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
});

// ==================== 归档 API ====================

// GET /api/archive - 获取文章归档（按年月分组）
app.get('/api/archive', (req, res) => {
    const sql = `
        SELECT 
            strftime('%Y', created_at) as year,
            strftime('%m', created_at) as month,
            strftime('%Y-%m', created_at) as year_month,
            COUNT(*) as count
        FROM articles 
        GROUP BY year_month
        ORDER BY year_month DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('获取归档失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
});

// GET /api/archive/:yearMonth - 获取指定月份的文章
app.get('/api/archive/:yearMonth', (req, res) => {
    const { yearMonth } = req.params;
    
    const sql = `
        SELECT articles.*, users.username as author_name 
        FROM articles 
        LEFT JOIN users ON articles.user_id = users.id 
        WHERE strftime('%Y-%m', articles.created_at) = ?
        ORDER BY articles.created_at DESC
    `;
    
    db.all(sql, [yearMonth], (err, rows) => {
        if (err) {
            console.error('获取归档文章失败:', err.message);
            res.status(500).json({ error: '服务器错误' });
            return;
        }
        res.json(rows);
    });
});

// app.get('/', (req, res) => {
//     res.send('服务器运行正常！');
// });

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});