// routes/auth.js - 认证路由
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/register - 用户注册
router.post('/register', register);

// POST /api/login - 用户登录
router.post('/login', login);

module.exports = router;
