// tests/helpers.js - 测试辅助函数
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const JWT_SECRET = 'your-secret-key-2024';
const prisma = new PrismaClient();

// 初始化测试数据库（push schema）
async function initTestDatabase() {
    const { execSync } = require('child_process');
    execSync('npx prisma db push --force-reset --accept-data-loss 2>&1', {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'pipe',
    });
}

// 创建测试用户，返回 { user, token, plainPassword }
async function createTestUser(overrides = {}) {
    const username = overrides.username || `testuser_${Date.now()}`;
    const password = overrides.password || 'TestPass123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username,
            password: hashedPassword,
        },
    });

    const token = jwt.sign(
        { userId: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return { user, token, plainPassword: password };
}

// 创建第二个用户（用于权限测试）
async function createSecondUser() {
    return createTestUser({ username: `second_${Date.now()}` });
}

// 创建测试文章
async function createTestArticle(userId, overrides = {}) {
    return prisma.article.create({
        data: {
            title: overrides.title || '测试文章标题',
            content: overrides.content || '这是测试文章的内容正文',
            summary: overrides.summary || '测试摘要',
            userId,
            status: overrides.status || 'published',
            isPinned: overrides.isPinned || 0,
            isPaid: overrides.isPaid || 0,
            price: overrides.price || 0,
            views: overrides.views || 0,
        },
    });
}

// 创建测试评论
async function createTestComment(articleId, userId, overrides = {}) {
    return prisma.comment.create({
        data: {
            content: overrides.content || '这是一条测试评论',
            articleId,
            userId,
            userName: overrides.userName || '测试用户',
            parentId: overrides.parentId || null,
        },
    });
}

// 确保订阅方案存在
async function ensureSubscriptionPlans() {
    const count = await prisma.subscriptionPlan.count();
    if (count > 0) return;

    const plans = [
        { name: '月度会员', price: 9.9, durationDays: 30, features: ['adFree', 'highQuality'] },
        { name: '年度会员', price: 99, durationDays: 365, features: ['adFree', 'highQuality', 'exclusiveContent'] },
    ];
    for (const plan of plans) {
        await prisma.subscriptionPlan.create({ data: { ...plan, isActive: true } });
    }
}

// 清理所有测试数据（按外键顺序）
async function cleanDatabase() {
    await prisma.paymentRecord.deleteMany();
    await prisma.userSubscription.deleteMany();
    await prisma.subscriptionPlan.deleteMany();
    await prisma.articlePurchase.deleteMany();
    await prisma.articleTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.userFollow.deleteMany();
    await prisma.articleCollection.deleteMany();
    await prisma.articleLike.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.article.deleteMany();
    await prisma.creatorProfile.deleteMany();
    await prisma.user.deleteMany();
}

// 构建 Authorization 头
function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
}

module.exports = {
    prisma,
    initTestDatabase,
    createTestUser,
    createSecondUser,
    createTestArticle,
    createTestComment,
    ensureSubscriptionPlans,
    cleanDatabase,
    authHeader,
};
