// routes/upload.js - 上传路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { upload, uploadImage, uploadErrorHandler } = require('../controllers/uploadController');

// POST /api/upload - 上传图片
router.post('/', authenticateToken, upload.single('image'), uploadImage, uploadErrorHandler);

module.exports = router;
