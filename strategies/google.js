// strategies/google.js — Passport Google OAuth 策略
//
// 使用前需安装: npm install passport-google-oauth20
// 并在 Google Cloud Console 创建 OAuth 2.0 凭据
//   重定向 URI: http://localhost:3000/api/auth/google/callback

let GoogleStrategy;
try {
  GoogleStrategy = require('passport-google-oauth20').Strategy;
} catch {
  // 未安装时跳过
}

const prisma = require('../db/index');
const logger = require('../utils/logger');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const googleStrategy =
  GoogleStrategy && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL:
            process.env.GOOGLE_CALLBACK_URL ||
            'http://localhost:3000/api/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const oauthId = profile.id;
            const email = profile.emails?.[0]?.value || null;
            const displayName = profile.displayName || 'google_user';
            const avatar = profile.photos?.[0]?.value || null;

            logger.info(`Google OAuth: ${displayName} (${email || '无邮箱'})`);

            // 1. 按 OAuth provider + id 查找
            let user = await prisma.user.findFirst({
              where: { oauthProvider: 'google', oauthId },
            });

            if (user) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { avatar },
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
                    oauthProvider: 'google',
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
                oauthProvider: 'google',
                oauthId,
                password: null,
              },
            });

            return done(null, user);
          } catch (err) {
            logger.error(`Google OAuth 错误: ${err.message}`, {
              stack: err.stack,
            });
            return done(err, null);
          }
        }
      )
    : null;

async function generateUniqueUsername(baseName) {
  let username =
    baseName.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'google_user';
  let exists = await prisma.user.findUnique({ where: { username } });
  let suffix = 1;

  while (exists) {
    username = `${baseName.slice(0, 15)}_${suffix}`;
    suffix++;
    exists = await prisma.user.findUnique({ where: { username } });
  }

  return username;
}

module.exports = googleStrategy;
