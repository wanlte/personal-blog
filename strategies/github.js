// strategies/github.js — Passport GitHub OAuth 策略

const GitHubStrategy = require('passport-github2').Strategy;
const prisma = require('../db/index');
const logger = require('../utils/logger');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const githubStrategy =
  GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET
    ? new GitHubStrategy(
        {
          clientID: GITHUB_CLIENT_ID,
          clientSecret: GITHUB_CLIENT_SECRET,
          callbackURL:
            process.env.GITHUB_CALLBACK_URL ||
            'http://localhost:3000/api/auth/github/callback',
          scope: ['user:email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const oauthId = profile.id;
            const displayName = profile.displayName || profile.username;
            const avatar = profile.photos?.[0]?.value || null;

            let email = null;
            if (profile.emails && profile.emails.length > 0) {
              const primary =
                profile.emails.find((e) => e.primary) || profile.emails[0];
              email = primary.value;
            }

            logger.info(`GitHub OAuth: ${displayName} (${email || '无邮箱'})`);

            // 1. 按 OAuth provider + id 查找
            let user = await prisma.user.findFirst({
              where: { oauthProvider: 'github', oauthId },
            });

            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { avatar, username: displayName.slice(0, 255) },
              });
              return done(null, user);
            }

            // 2. 按邮箱关联已有账号
            if (email) {
              const emailUser = await prisma.user.findUnique({
                where: { email },
              });
              if (emailUser) {
                user = await prisma.user.update({
                  where: { id: emailUser.id },
                  data: {
                    oauthProvider: 'github',
                    oauthId,
                    avatar: avatar || emailUser.avatar,
                  },
                });
                return done(null, user);
              }
            }

            // 3. 创建新用户
            const username = await generateUniqueUsername(displayName);
            user = await prisma.user.create({
              data: {
                username,
                email,
                avatar,
                oauthProvider: 'github',
                oauthId,
                password: null,
              },
            });

            return done(null, user);
          } catch (err) {
            logger.error(`GitHub OAuth 错误: ${err.message}`, {
              stack: err.stack,
            });
            return done(err, null);
          }
        }
      )
    : null;

async function generateUniqueUsername(baseName) {
  let username =
    baseName.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'github_user';
  let exists = await prisma.user.findUnique({ where: { username } });
  let suffix = 1;

  while (exists) {
    username = `${baseName.slice(0, 15)}_${suffix}`;
    suffix++;
    exists = await prisma.user.findUnique({ where: { username } });
  }

  return username;
}

module.exports = githubStrategy;
