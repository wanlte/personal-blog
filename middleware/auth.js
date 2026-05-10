// middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');
const JWT_SECRET = config.jwt.secret;

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

// 可选认证中间件（不强制登录，但如果有token则解析）
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        next();
        return;
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
}

module.exports = { authenticateToken, optionalAuth, JWT_SECRET };
