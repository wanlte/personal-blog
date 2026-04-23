// controllers/authController.js - 用户认证控制器
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/register - 用户注册
async function register(req, res) {
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
}

// POST /api/login - 用户登录
async function login(req, res) {
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
}

module.exports = { register, login };
