// routes/oauth.js — OAuth 第三方登录路由
//   GitHub: /api/auth/github, /api/auth/github/callback
//   Google:  /api/auth/google, /api/auth/google/callback

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');

const router = express.Router();

// ——— Passport 初始化 ———
const githubStrategy = require('../strategies/github');
const googleStrategy = require('../strategies/google');

if (githubStrategy) {
  passport.use(githubStrategy);
  logger.info('GitHub OAuth 已配置');
} else {
  logger.info('GitHub OAuth 未配置（缺少 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET）');
}

if (googleStrategy) {
  passport.use(googleStrategy);
  logger.info('Google OAuth 已配置');
}

// 序列化/反序列化（使用 JWT 时不需要 session，但 Passport 内部需要）
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const { default: prisma } = require('../db/index');
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ——— 辅助函数 ———
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function oauthCallbackRedirect(req, res) {
  const token = generateToken(req.user);
  const frontendUrl = config.cors.frontendUrl;
  const redirectUrl = `${frontendUrl}/oauth/callback?token=${token}&username=${encodeURIComponent(req.user.username)}&userId=${req.user.id}`;

  logger.info(`OAuth 登录成功: ${req.user.username} (${req.user.oauthProvider})`);
  res.redirect(redirectUrl);
}

// ——— GitHub OAuth ———

if (githubStrategy) {
  /**
   * @swagger
   * /api/auth/github:
   *   get:
   *     tags: [认证]
   *     summary: GitHub OAuth 登录
   *     description: 跳转到 GitHub 授权页面
   *     responses:
   *       302:
   *         description: 重定向到 GitHub
   */
  router.get(
    '/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );

  /**
   * @swagger
   * /api/auth/github/callback:
   *   get:
   *     tags: [认证]
   *     summary: GitHub OAuth 回调
   *     description: GitHub 授权后回调，创建/关联用户并返回 JWT
   *     responses:
   *       302:
   *         description: 重定向到前端带 token
   */
  router.get(
    '/auth/github/callback',
    passport.authenticate('github', {
      session: false,
      failureRedirect: `${config.cors.frontendUrl}/login?error=oauth_failed`,
    }),
    oauthCallbackRedirect
  );
}

// ——— Google OAuth ———

if (googleStrategy) {
  /**
   * @swagger
   * /api/auth/google:
   *   get:
   *     tags: [认证]
   *     summary: Google OAuth 登录
   *     description: 跳转到 Google 授权页面
   *     responses:
   *       302:
   *         description: 重定向到 Google
   */
  router.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  /**
   * @swagger
   * /api/auth/google/callback:
   *   get:
   *     tags: [认证]
   *     summary: Google OAuth 回调
   *     description: Google 授权后回调，创建/关联用户并返回 JWT
   *     responses:
   *       302:
   *         description: 重定向到前端带 token
   */
  router.get(
    '/auth/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${config.cors.frontendUrl}/login?error=oauth_failed`,
    }),
    oauthCallbackRedirect
  );
}

// ——— OAuth 错误处理 ———
router.use((err, req, res, _next) => {
  logger.error(`OAuth 错误: ${err.message}`, { stack: err.stack });
  const frontendUrl = config.cors.frontendUrl;
  res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(err.message)}`);
});

module.exports = { router, githubStrategy, googleStrategy };
