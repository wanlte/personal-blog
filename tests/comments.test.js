// tests/comments.test.js - 评论功能测试
const request = require('supertest');
const app = require('./app');
const { prisma } = require('./helpers');
const { createTestUser, createSecondUser, createTestArticle, createTestComment, cleanDatabase, authHeader } = require('./helpers');

beforeEach(async () => {
    await cleanDatabase();
});

afterAll(async () => {
    await cleanDatabase();
});

describe('POST /api/articles/:id/comments', () => {
    it('登录用户应能发表评论', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .post(`/api/articles/${article.id}/comments`)
            .set(authHeader(token))
            .send({ content: '这是一条测试评论' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('content', '这是一条测试评论');
    });

    it('游客应能发表评论（提供用户名）', async () => {
        const { user } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .post(`/api/articles/${article.id}/comments`)
            .send({ content: '游客评论', userName: '路人甲' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('user_name', '路人甲');
    });

    it('应拒绝空评论', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .post(`/api/articles/${article.id}/comments`)
            .set(authHeader(token))
            .send({ content: '' });

        expect(res.status).toBe(400);
    });

    it('不存在的文章应返回 404', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .post('/api/articles/99999/comments')
            .set(authHeader(token))
            .send({ content: '评论内容' });

        expect(res.status).toBe(404);
    });

    it('应支持嵌套回复', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);
        const parentComment = await createTestComment(article.id, user.id);

        const res = await request(app)
            .post(`/api/articles/${article.id}/comments`)
            .set(authHeader(token))
            .send({ content: '回复父评论', parentId: parentComment.id });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('parent_id', parentComment.id);
    });

    it('引用不存在的父评论应返回 404', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .post(`/api/articles/${article.id}/comments`)
            .set(authHeader(token))
            .send({ content: '回复不存在评论', parentId: 99999 });

        expect(res.status).toBe(404);
    });
});

describe('GET /api/articles/:id/comments', () => {
    it('应返回文章的所有评论', async () => {
        const { user } = await createTestUser();
        const article = await createTestArticle(user.id);
        await createTestComment(article.id, user.id, { content: '评论1' });
        await createTestComment(article.id, user.id, { content: '评论2' });

        const res = await request(app).get(`/api/articles/${article.id}/comments`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
    });

    it('应按创建时间升序排列', async () => {
        const { user } = await createTestUser();
        const article = await createTestArticle(user.id);
        await createTestComment(article.id, user.id, { content: '先发的' });
        await new Promise(r => setTimeout(r, 50)); // 确保时间差
        await createTestComment(article.id, user.id, { content: '后发的' });

        const res = await request(app).get(`/api/articles/${article.id}/comments`);

        expect(res.body[0].content).toBe('先发的');
        expect(res.body[1].content).toBe('后发的');
    });

    it('无评论时返回空数组', async () => {
        const { user } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app).get(`/api/articles/${article.id}/comments`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe('DELETE /api/comments/:id', () => {
    it('作者应能删除自己的评论', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);
        const comment = await createTestComment(article.id, user.id);

        const res = await request(app)
            .delete(`/api/comments/${comment.id}`)
            .set(authHeader(token));

        expect(res.status).toBe(200);
    });

    it('非作者删除他人评论应返回 403', async () => {
        const { user } = await createTestUser();
        const { token: otherToken } = await createSecondUser();
        const article = await createTestArticle(user.id);
        const comment = await createTestComment(article.id, user.id);

        const res = await request(app)
            .delete(`/api/comments/${comment.id}`)
            .set(authHeader(otherToken));

        expect(res.status).toBe(403);
    });

    it('不存在的评论应返回 404', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .delete('/api/comments/99999')
            .set(authHeader(token));

        expect(res.status).toBe(404);
    });
});
