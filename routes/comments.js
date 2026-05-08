// routes/comments.js - 评论路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createComment, getComments, deleteComment } = require('../controllers/commentsController');

/**
 * @swagger
 * /api/articles/{id}/comments:
 *   get:
 *     tags: [评论]
 *     summary: 获取文章评论
 *     description: 获取指定文章的所有评论（含嵌套回复）
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 评论列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: integer }
 *                   content: { type: string }
 *                   userName: { type: string }
 *                   createdAt: { type: string }
 *                   replies: { type: array, items: { type: object } }
 */
router.get('/articles/:id/comments', getComments);

/**
 * @swagger
 * /api/articles/{id}/comments:
 *   post:
 *     tags: [评论]
 *     summary: 发表评论
 *     description: 为指定文章发表评论（支持匿名和登录用户）
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommentRequest'
 *     responses:
 *       201:
 *         description: 评论成功
 *       400:
 *         description: 参数验证失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/articles/:id/comments', createComment);

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     tags: [评论]
 *     summary: 删除评论
 *     description: 删除指定评论（需认证）
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 评论 ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权删除
 */
router.delete('/comments/:id', authenticateToken, deleteComment);

module.exports = router;
