// routes/upload.js - 上传路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { upload, uploadImage, uploadErrorHandler } = require('../controllers/uploadController');

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [上传]
 *     summary: 上传图片
 *     description: 上传图片文件（multipart/form-data），返回文件访问 URL
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 图片文件（jpg/png/gif/webp）
 *     responses:
 *       200:
 *         description: 上传成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string, example: '/uploads/1715000000-abc123.jpg' }
 *       400:
 *         description: 文件类型或大小不符合要求
 */
router.post('/', authenticateToken, upload.single('image'), uploadImage, uploadErrorHandler);

module.exports = router;
