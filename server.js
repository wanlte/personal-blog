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

// app.get('/', (req, res) => {
//     res.send('服务器运行正常！');
// });

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});