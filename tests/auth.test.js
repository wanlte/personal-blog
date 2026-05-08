// tests/auth.test.js - 认证接口测试
const request = require('supertest');
const app = require('./app');
const { prisma } = require('./helpers');
const { createTestUser, cleanDatabase } = require('./helpers');

beforeEach(async () => {
    await cleanDatabase();
});

afterAll(async () => {
    await cleanDatabase();
});

describe('POST /api/register', () => {
    it('应成功注册新用户', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'newuser', password: 'StrongPwd1' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('userId');
        expect(res.body).toHaveProperty('message', '注册成功');
    });

    it('应拒绝空用户名', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ username: '', password: 'StrongPwd1' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('应拒绝短密码', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({ username: 'another', password: '123' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', '密码长度不能少于6位');
    });

    it('应拒绝重复用户名', async () => {
        await createTestUser({ username: 'dupuser' });

        const res = await request(app)
            .post('/api/register')
            .send({ username: 'dupuser', password: 'Another1!' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', '用户名已存在');
    });

    it('密码应被加密存储（非明文）', async () => {
        await request(app)
            .post('/api/register')
            .send({ username: 'secureuser', password: 'SecurePwd1' });

        const user = await prisma.user.findUnique({ where: { username: 'secureuser' } });
        expect(user.password).not.toBe('SecurePwd1');
        expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash 格式
    });

    it('注册时可附带订阅方案', async () => {
        // 先创建订阅方案
        await prisma.subscriptionPlan.create({
            data: {
                name: '测试月度',
                price: 9.9,
                durationDays: 30,
                features: ['test'],
                isActive: true,
            },
        });

        const plan = await prisma.subscriptionPlan.findFirst();

        const res = await request(app)
            .post('/api/register')
            .send({ username: 'subuser', password: 'SubPwd123', planId: plan.id });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('subscription');
        expect(res.body.subscription.planName).toBe('测试月度');
    });
});

describe('POST /api/login', () => {
    it('应成功登录并返回 token', async () => {
        await createTestUser({ username: 'logintest' });

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'logintest', password: 'TestPass123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toHaveProperty('username', 'logintest');
    });

    it('应拒绝错误密码', async () => {
        await createTestUser({ username: 'logintest2' });

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'logintest2', password: 'WrongPass1' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error', '用户名或密码错误');
    });

    it('应拒绝不存在的用户', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'nobody', password: 'SomePass1' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    it('应拒绝空凭据', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: '', password: '' });

        expect(res.status).toBe(400);
    });

    it('返回的 token 应包含用户信息', async () => {
        await createTestUser({ username: 'tokentest' });

        const res = await request(app)
            .post('/api/login')
            .send({ username: 'tokentest', password: 'TestPass123' });

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(res.body.token, 'your-secret-key-2024');
        expect(decoded).toHaveProperty('userId');
        expect(decoded).toHaveProperty('username', 'tokentest');
        expect(decoded).toHaveProperty('exp');
    });
});

describe('认证中间件', () => {
    it('无 token 请求受保护接口应返回 401', async () => {
        const res = await request(app)
            .post('/api/articles')
            .send({ title: '测试', content: '内容' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error', '请先登录');
    });

    it('无效 token 应返回 403', async () => {
        const res = await request(app)
            .post('/api/articles')
            .set('Authorization', 'Bearer invalid.token.here')
            .send({ title: '测试', content: '内容' });

        expect(res.status).toBe(403);
    });
});
