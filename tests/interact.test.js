// tests/interact.test.js - 点赞、收藏、关注功能测试
const request = require('supertest');
const app = require('./app');
const { prisma } = require('./helpers');
const { createTestUser, createSecondUser, createTestArticle, cleanDatabase, authHeader } = require('./helpers');

beforeEach(async () => {
    await cleanDatabase();
});

afterAll(async () => {
    await cleanDatabase();
});

describe('点赞 /api/articles/:id/like', () => {
    it('用户应能点赞文章', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .post(`/api/articles/${article.id}/like`)
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('liked', true);
        expect(res.body).toHaveProperty('count', 1);
    });

    it('重复点赞应返回 409', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        await request(app).post(`/api/articles/${article.id}/like`).set(authHeader(token));
        const res = await request(app).post(`/api/articles/${article.id}/like`).set(authHeader(token));

        expect(res.status).toBe(409);
    });

    it('用户应能取消点赞', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        await request(app).post(`/api/articles/${article.id}/like`).set(authHeader(token));
        const res = await request(app).delete(`/api/articles/${article.id}/like`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('liked', false);
        expect(res.body).toHaveProperty('count', 0);
    });

    it('未点赞的取消操作应返回 404', async () => {
        const { token } = await createTestUser();
        const article = await createTestArticle((await createTestUser()).user.id);

        const res = await request(app)
            .delete(`/api/articles/${article.id}/like`)
            .set(authHeader(token));

        expect(res.status).toBe(404);
    });

    it('未登录用户不能点赞', async () => {
        const article = await createTestArticle((await createTestUser()).user.id);

        const res = await request(app).post(`/api/articles/${article.id}/like`);

        expect(res.status).toBe(401);
    });
});

describe('收藏 /api/articles/:id/collect', () => {
    it('用户应能收藏文章', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .post(`/api/articles/${article.id}/collect`)
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('collected', true);
        expect(res.body).toHaveProperty('count', 1);
    });

    it('重复收藏应返回 409', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        await request(app).post(`/api/articles/${article.id}/collect`).set(authHeader(token));
        const res = await request(app).post(`/api/articles/${article.id}/collect`).set(authHeader(token));

        expect(res.status).toBe(409);
    });

    it('用户应能取消收藏', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        await request(app).post(`/api/articles/${article.id}/collect`).set(authHeader(token));
        const res = await request(app).delete(`/api/articles/${article.id}/collect`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('collected', false);
        expect(res.body).toHaveProperty('count', 0);
    });
});

describe('关注 /api/users/:id/follow', () => {
    it('用户应能关注其他用户', async () => {
        const { token } = await createTestUser();
        const { user: target } = await createSecondUser();

        const res = await request(app)
            .post(`/api/users/${target.id}/follow`)
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('following', true);
    });

    it('不能关注自己', async () => {
        const { user, token } = await createTestUser();

        const res = await request(app)
            .post(`/api/users/${user.id}/follow`)
            .set(authHeader(token));

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', '不能关注自己');
    });

    it('重复关注应返回 409', async () => {
        const { token } = await createTestUser();
        const { user: target } = await createSecondUser();

        await request(app).post(`/api/users/${target.id}/follow`).set(authHeader(token));
        const res = await request(app).post(`/api/users/${target.id}/follow`).set(authHeader(token));

        expect(res.status).toBe(409);
    });

    it('应能取消关注', async () => {
        const { token } = await createTestUser();
        const { user: target } = await createSecondUser();

        await request(app).post(`/api/users/${target.id}/follow`).set(authHeader(token));
        const res = await request(app).delete(`/api/users/${target.id}/follow`).set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('following', false);
    });

    it('取消未关注的用户应返回 404', async () => {
        const { token } = await createTestUser();
        const { user: target } = await createSecondUser();

        const res = await request(app)
            .delete(`/api/users/${target.id}/follow`)
            .set(authHeader(token));

        expect(res.status).toBe(404);
    });
});

describe('互动状态查询', () => {
    it('GET /api/articles/:id/interaction 应返回正确的互动计数', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        // 点赞并收藏
        await request(app).post(`/api/articles/${article.id}/like`).set(authHeader(token));
        await request(app).post(`/api/articles/${article.id}/collect`).set(authHeader(token));

        const res = await request(app)
            .get(`/api/articles/${article.id}/interaction`)
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('likeCount', 1);
        expect(res.body).toHaveProperty('collectCount', 1);
        expect(res.body).toHaveProperty('liked', true);
        expect(res.body).toHaveProperty('collected', true);
    });
});
