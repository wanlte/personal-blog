// tests/subscription.test.js - 订阅功能测试
const request = require('supertest');
const app = require('./app');
const { prisma } = require('./helpers');
const { createTestUser, ensureSubscriptionPlans, cleanDatabase, authHeader } = require('./helpers');

beforeEach(async () => {
    await cleanDatabase();
    await ensureSubscriptionPlans();
});

afterAll(async () => {
    await cleanDatabase();
});

describe('GET /api/subscription/plans', () => {
    it('应返回所有有效方案', async () => {
        const res = await request(app).get('/api/subscription/plans');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
        expect(res.body[0]).toHaveProperty('name');
        expect(res.body[0]).toHaveProperty('price');
        expect(res.body[0]).toHaveProperty('durationDays');
        expect(res.body[0]).toHaveProperty('isActive', true);
    });
});

describe('GET /api/subscription/status', () => {
    it('未订阅时应返回 hasSubscription: false', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .get('/api/subscription/status')
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('hasSubscription', false);
    });

    it('未登录应返回 401', async () => {
        const res = await request(app).get('/api/subscription/status');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/subscription/subscribe', () => {
    it('用户应能订阅一个方案', async () => {
        const { token } = await createTestUser();
        const plans = await prisma.subscriptionPlan.findMany();
        const plan = plans[0];

        const res = await request(app)
            .post('/api/subscription/subscribe')
            .set(authHeader(token))
            .send({ planId: plan.id, paymentMethod: 'alipay' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('subscription');
        expect(res.body.subscription).toHaveProperty('planName', plan.name);
        expect(res.body.subscription).toHaveProperty('startDate');
        expect(res.body.subscription).toHaveProperty('endDate');
        expect(res.body).toHaveProperty('payment');
    });

    it('订阅后状态应变为 active', async () => {
        const { token } = await createTestUser();
        const plans = await prisma.subscriptionPlan.findMany();
        const plan = plans[0];

        await request(app)
            .post('/api/subscription/subscribe')
            .set(authHeader(token))
            .send({ planId: plan.id });

        const statusRes = await request(app)
            .get('/api/subscription/status')
            .set(authHeader(token));

        expect(statusRes.body).toHaveProperty('hasSubscription', true);
        expect(statusRes.body.subscription).toHaveProperty('status', 'active');
    });

    it('不存在的方案应返回 404', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .post('/api/subscription/subscribe')
            .set(authHeader(token))
            .send({ planId: 99999 });

        expect(res.status).toBe(404);
    });

    it('未指定方案应返回 400', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .post('/api/subscription/subscribe')
            .set(authHeader(token))
            .send({});

        expect(res.status).toBe(400);
    });
});

describe('POST /api/subscription/cancel', () => {
    it('用户应能取消有效订阅', async () => {
        const { token } = await createTestUser();
        const plans = await prisma.subscriptionPlan.findMany();
        const plan = plans[0];

        await request(app)
            .post('/api/subscription/subscribe')
            .set(authHeader(token))
            .send({ planId: plan.id });

        const res = await request(app)
            .post('/api/subscription/cancel')
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message');
    });

    it('无有效订阅时取消应返回 404', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .post('/api/subscription/cancel')
            .set(authHeader(token));

        expect(res.status).toBe(404);
    });
});

describe('GET /api/subscription/history', () => {
    it('应返回订阅历史', async () => {
        const { token } = await createTestUser();
        const plans = await prisma.subscriptionPlan.findMany();

        // 先订阅
        await request(app)
            .post('/api/subscription/subscribe')
            .set(authHeader(token))
            .send({ planId: plans[0].id });

        const res = await request(app)
            .get('/api/subscription/history')
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('subscriptions');
        expect(res.body).toHaveProperty('payments');
        expect(res.body.subscriptions.length).toBeGreaterThanOrEqual(1);
        expect(res.body.payments.length).toBeGreaterThanOrEqual(1);
    });
});

describe('订阅续期', () => {
    it('在有效期内续期应延长 endDate', async () => {
        const { token } = await createTestUser();
        const plans = await prisma.subscriptionPlan.findMany();
        const plan = plans[0];

        // 初次订阅
        await request(app)
            .post('/api/subscription/subscribe')
            .set(authHeader(token))
            .send({ planId: plan.id });

        const firstStatus = await request(app)
            .get('/api/subscription/status')
            .set(authHeader(token));
        const firstEndDate = firstStatus.body.subscription.endDate;

        // 续期
        await request(app)
            .post('/api/subscription/subscribe')
            .set(authHeader(token))
            .send({ planId: plan.id });

        const secondStatus = await request(app)
            .get('/api/subscription/status')
            .set(authHeader(token));
        const secondEndDate = secondStatus.body.subscription.endDate;

        // 新的 endDate 应大于旧的
        expect(new Date(secondEndDate).getTime()).toBeGreaterThan(new Date(firstEndDate).getTime());
    });
});
