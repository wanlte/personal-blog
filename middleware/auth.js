// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key-2024';

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

module.exports = { authenticateToken, JWT_SECRET };
