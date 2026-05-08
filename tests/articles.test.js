// tests/articles.test.js - 文章 CRUD 测试
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

describe('GET /api/articles', () => {
    it('应返回已发布的文章列表', async () => {
        const { user, token } = await createTestUser();
        await createTestArticle(user.id, { title: '文章1' });
        await createTestArticle(user.id, { title: '文章2' });

        const res = await request(app).get('/api/articles');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(2);
        expect(res.body[0]).toHaveProperty('title');
    });

    it('不应返回草稿', async () => {
        const { user } = await createTestUser();
        await createTestArticle(user.id, { title: '已发布' });
        await createTestArticle(user.id, { title: '草稿', status: 'draft' });

        const res = await request(app).get('/api/articles');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].title).toBe('已发布');
    });

    it('应当按置顶优先排序', async () => {
        const { user } = await createTestUser();
        await createTestArticle(user.id, { title: '普通文章' });
        await createTestArticle(user.id, { title: '置顶文章', isPinned: 1 });

        const res = await request(app).get('/api/articles');

        expect(res.body[0].title).toBe('置顶文章');
        expect(res.body[0].is_pinned).toBe(1);
    });

    it('应按标签筛选', async () => {
        const { user } = await createTestUser();
        const article = await createTestArticle(user.id, { title: '带标签文章' });

        // 创建标签并关联
        const tag = await prisma.tag.create({ data: { name: '测试标签' } });
        await prisma.articleTag.create({ articleId: article.id, tagId: tag.id });

        const res = await request(app).get('/api/articles?tag=测试标签');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);
    });
});

describe('GET /api/articles/:id', () => {
    it('应返回单篇文章详情', async () => {
        const { user } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app).get(`/api/articles/${article.id}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('title', '测试文章标题');
        expect(res.body).toHaveProperty('content');
        expect(res.body).toHaveProperty('author_name');
    });

    it('不存在的文章应返回 404', async () => {
        const res = await request(app).get('/api/articles/99999');
        expect(res.status).toBe(404);
    });

    it('应增加浏览量', async () => {
        const { user } = await createTestUser();
        const article = await createTestArticle(user.id, { views: 10 });

        const res = await request(app).get(`/api/articles/${article.id}`);

        expect(res.body.views).toBe(11); // +1
    });
});

describe('POST /api/articles', () => {
    it('应创建新文章', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .post('/api/articles')
            .set(authHeader(token))
            .send({ title: '新文章', content: '正文内容', summary: '摘要' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('message', '文章创建成功');
    });

    it('应拒绝无标题的文章', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .post('/api/articles')
            .set(authHeader(token))
            .send({ content: '正文', summary: '摘要' });

        expect(res.status).toBe(400);
    });

    it('未登录应返回 401', async () => {
        const res = await request(app)
            .post('/api/articles')
            .send({ title: '新文章', content: '正文' });

        expect(res.status).toBe(401);
    });
});

describe('PUT /api/articles/:id', () => {
    it('作者应能更新自己的文章', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .put(`/api/articles/${article.id}`)
            .set(authHeader(token))
            .send({ title: '更新标题', content: '更新内容', summary: '更新摘要' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', '文章更新成功');
    });

    it('非作者应不能更新文章', async () => {
        const { user } = await createTestUser();
        const { token: otherToken } = await createSecondUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .put(`/api/articles/${article.id}`)
            .set(authHeader(otherToken))
            .send({ title: '想偷改', content: '不行' });

        expect(res.status).toBe(403);
    });
});

describe('DELETE /api/articles/:id', () => {
    it('作者应能删除自己的文章', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .delete(`/api/articles/${article.id}`)
            .set(authHeader(token));

        expect(res.status).toBe(200);
    });

    it('非作者应不能删除文章', async () => {
        const { user } = await createTestUser();
        const { token: otherToken } = await createSecondUser();
        const article = await createTestArticle(user.id);

        const res = await request(app)
            .delete(`/api/articles/${article.id}`)
            .set(authHeader(otherToken));

        expect(res.status).toBe(403);
    });
});

describe('PUT /api/articles/:id/pin', () => {
    it('作者应能置顶/取消置顶自己的文章', async () => {
        const { user, token } = await createTestUser();
        const article = await createTestArticle(user.id);

        // 置顶
        const pinRes = await request(app)
            .put(`/api/articles/${article.id}/pin`)
            .set(authHeader(token));

        expect(pinRes.status).toBe(200);
        expect(pinRes.body.is_pinned).toBe(1);

        // 取消置顶
        const unpinRes = await request(app)
            .put(`/api/articles/${article.id}/pin`)
            .set(authHeader(token));

        expect(unpinRes.status).toBe(200);
        expect(unpinRes.body.is_pinned).toBe(0);
    });
});

describe('草稿功能', () => {
    it('应保存草稿', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
            .post('/api/articles/draft')
            .set(authHeader(token))
            .send({ title: '草稿标题', content: '草稿内容' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', '草稿已保存');
    });

    it('应获取草稿列表', async () => {
        const { user, token } = await createTestUser();
        await createTestArticle(user.id, { title: '草稿A', status: 'draft' });
        await createTestArticle(user.id, { title: '草稿B', status: 'draft' });
        await createTestArticle(user.id, { title: '已发布的文章' });

        const res = await request(app)
            .get('/api/articles/drafts/list')
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        // 应返回草稿数量
        const drafts = res.body;
        const draftTitles = drafts.map(d => d.title);
        expect(draftTitles).toContain('草稿A');
        expect(draftTitles).toContain('草稿B');
        expect(draftTitles).not.toContain('已发布的文章');
    });

    it('应发布草稿', async () => {
        const { user, token } = await createTestUser();
        const draft = await createTestArticle(user.id, { status: 'draft' });

        const res = await request(app)
            .put(`/api/articles/${draft.id}/publish`)
            .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', '发布成功');

        // 验证状态已更新
        const updated = await prisma.article.findUnique({ where: { id: draft.id } });
        expect(updated.status).toBe('published');
    });
});
