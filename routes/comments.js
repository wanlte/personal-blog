// routes/comments.js - 评论路由
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createComment, getComments, deleteComment } = require('../controllers/commentsController');

// GET /api/articles/:id/comments - 获取文章评论
router.get('/articles/:id/comments', getComments);

// POST /api/articles/:id/comments - 发表评论
router.post('/articles/:id/comments', createComment);

// DELETE /api/comments/:id - 删除评论
router.delete('/comments/:id', authenticateToken, deleteComment);

module.exports = router;
