// tests/e2e/comment.spec.js - 评论功能 E2E 测试
const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const ArticlePage = require('../../pages/ArticlePage');

test.describe('评论功能 (comment)', () => {
  let loginPage;
  let articlePage;
  let request;
  const testUser = `e2e_comment_${Date.now()}`;
  const testPassword = 'CommentPass1';
  let articleId;

  test.beforeAll(async ({ request: req }) => {
    request = req;
    loginPage = new LoginPage(request);
    await loginPage.register({ username: testUser, password: testPassword });
    await loginPage.login(testUser, testPassword);
    articlePage = new ArticlePage(request, loginPage.getAuthHeaders());

    // 创建测试文章
    const { body } = await articlePage.create({
      title: 'Comment Test Article',
      content: 'Content for comment testing.',
    });
    articleId = body.id;
  });

  test.afterAll(async () => {
    if (articleId) {
      try { await articlePage.delete(articleId); } catch { /* ignore cleanup error */ }
    }
  });

  test.describe('POST /api/articles/:id/comments', () => {
    test('发表评论', async () => {
      const res = await request.post(`/api/articles/${articleId}/comments`, {
        data: { content: 'Great article!', userName: 'Reader' },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('id');
      expect(body.content).toBe('Great article!');
      expect(body.user_name).toBe('Reader');
    });

    test('匿名评论', async () => {
      const res = await request.post(`/api/articles/${articleId}/comments`, {
        data: { content: 'Anonymous comment.' },
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.user_name).toBe('匿名');
    });

    test('空内容评论应返回 400', async () => {
      const res = await request.post(`/api/articles/${articleId}/comments`, {
        data: { content: '' },
      });

      expect(res.status()).toBe(400);
    });

    test('不存在的文章评论应返回 404', async () => {
      const res = await request.post('/api/articles/99999/comments', {
        data: { content: 'Comment on nothing.' },
      });

      expect(res.status()).toBe(404);
    });
  });

  test.describe('GET /api/articles/:id/comments', () => {
    test('获取文章评论列表', async () => {
      // 先添加几条评论
      await request.post(`/api/articles/${articleId}/comments`, {
        data: { content: 'Comment 1', userName: 'UserA' },
      });
      await request.post(`/api/articles/${articleId}/comments`, {
        data: { content: 'Comment 2', userName: 'UserB' },
      });

      const res = await request.get(`/api/articles/${articleId}/comments`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('DELETE /api/comments/:id', () => {
    test('删除自己的评论', async () => {
      // 以登录用户身份发评论
      const authHeaders = loginPage.getAuthHeaders();
      const createRes = await request.post(`/api/articles/${articleId}/comments`, {
        headers: authHeaders,
        data: { content: 'My comment to delete.' },
      });
      const { id: commentId } = await createRes.json();

      // 删除
      const delRes = await request.delete(`/api/comments/${commentId}`, {
        headers: authHeaders,
      });
      expect(delRes.status()).toBe(200);
    });

    test('无 token 删除评论应返回 401', async () => {
      const res = await request.delete('/api/comments/1');
      expect(res.status()).toBe(401);
    });
  });

  test.describe('嵌套回复', () => {
    test('回复评论', async () => {
      // 先发一条父评论
      const parentRes = await request.post(`/api/articles/${articleId}/comments`, {
        data: { content: 'Parent comment.', userName: 'Parent' },
      });
      const { id: parentId } = await parentRes.json();

      // 回复父评论
      const replyRes = await request.post(`/api/articles/${articleId}/comments`, {
        data: { content: 'Reply to parent.', parentId },
      });

      expect(replyRes.status()).toBe(200);
      const replyBody = await replyRes.json();
      expect(replyBody.parent_id).toBe(parentId);
    });

    test('回复不存在的父评论应返回 404', async () => {
      const res = await request.post(`/api/articles/${articleId}/comments`, {
        data: { content: 'Reply to ghost.', parentId: 99999 },
      });

      expect(res.status()).toBe(404);
    });
  });
});
