// routes/interact.js - 互动路由（点赞、收藏、关注、付费）
const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const {
  likeArticle, unlikeArticle, getMyLikes,
  collectArticle, uncollectArticle, getMyCollections,
  followUser, unfollowUser, getMyFollowers, getMyFollowing,
  getArticleInteraction, getUserProfile, getPopularAuthors,
  purchaseArticle, checkAccess
} = require('../controllers/interactController');

/**
 * @swagger
 * /api/authors/popular:
 *   get:
 *     tags: [互动]
 *     summary: 热门作者
 *     description: 获取粉丝最多的作者列表
 *     responses:
 *       200:
 *         description: 作者列表
 */
router.get('/authors/popular', getPopularAuthors);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [互动]
 *     summary: 用户主页
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 用户 ID
 *     responses:
 *       200:
 *         description: 用户公开信息
 */
router.get('/users/:id', getUserProfile);

/**
 * @swagger
 * /api/users/{id}/follow:
 *   post:
 *     tags: [互动]
 *     summary: 关注用户
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 被关注的用户 ID
 *     responses:
 *       200:
 *         description: 关注成功
 */
router.post('/users/:id/follow', authenticateToken, followUser);

/**
 * @swagger
 * /api/users/{id}/follow:
 *   delete:
 *     tags: [互动]
 *     summary: 取消关注
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 被取消关注的用户 ID
 *     responses:
 *       200:
 *         description: 取消成功
 */
router.delete('/users/:id/follow', authenticateToken, unfollowUser);

/**
 * @swagger
 * /api/user/followers:
 *   get:
 *     tags: [互动]
 *     summary: 我的粉丝
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 粉丝列表
 */
router.get('/user/followers', authenticateToken, getMyFollowers);

/**
 * @swagger
 * /api/user/following:
 *   get:
 *     tags: [互动]
 *     summary: 我关注的
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 关注列表
 */
router.get('/user/following', authenticateToken, getMyFollowing);

/**
 * @swagger
 * /api/articles/{id}/like:
 *   post:
 *     tags: [互动]
 *     summary: 点赞文章
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 点赞成功
 */
router.post('/articles/:id/like', authenticateToken, likeArticle);

/**
 * @swagger
 * /api/articles/{id}/like:
 *   delete:
 *     tags: [互动]
 *     summary: 取消点赞
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 取消成功
 */
router.delete('/articles/:id/like', authenticateToken, unlikeArticle);

/**
 * @swagger
 * /api/articles/{id}/collect:
 *   post:
 *     tags: [互动]
 *     summary: 收藏文章
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 收藏成功
 */
router.post('/articles/:id/collect', authenticateToken, collectArticle);

/**
 * @swagger
 * /api/articles/{id}/collect:
 *   delete:
 *     tags: [互动]
 *     summary: 取消收藏
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 取消成功
 */
router.delete('/articles/:id/collect', authenticateToken, uncollectArticle);

/**
 * @swagger
 * /api/user/likes:
 *   get:
 *     tags: [互动]
 *     summary: 我的点赞
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 点赞列表
 */
router.get('/user/likes', authenticateToken, getMyLikes);

/**
 * @swagger
 * /api/user/collections:
 *   get:
 *     tags: [互动]
 *     summary: 我的收藏
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 收藏列表
 */
router.get('/user/collections', authenticateToken, getMyCollections);

/**
 * @swagger
 * /api/articles/{id}/interaction:
 *   get:
 *     tags: [互动]
 *     summary: 文章互动状态
 *     description: 获取当前用户对文章的互动状态（点赞/收藏/关注作者），可选认证
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 互动状态
 */
router.get('/articles/:id/interaction', optionalAuth, getArticleInteraction);

/**
 * @swagger
 * /api/articles/{id}/purchase:
 *   post:
 *     tags: [互动]
 *     summary: 购买付费文章
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 购买成功
 *       400:
 *         description: 文章非付费或已购买
 */
router.post('/articles/:id/purchase', authenticateToken, purchaseArticle);

/**
 * @swagger
 * /api/articles/{id}/access:
 *   get:
 *     tags: [互动]
 *     summary: 检查文章访问权限
 *     description: 检查当前用户是否有权限阅读付费文章，可选认证
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: 文章 ID
 *     responses:
 *       200:
 *         description: 是否有权限
 */
router.get('/articles/:id/access', optionalAuth, checkAccess);

module.exports = router;
