// tests/e2e/article.spec.js - 文章 CRUD E2E 测试
const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const ArticlePage = require('../../pages/ArticlePage');

test.describe('文章管理 (article)', () => {
  let loginPage;
  let articlePage;
  const testUser = `e2e_article_${Date.now()}`;
  const testPassword = 'ArticlePass1';
  let createdArticleIds = [];

  test.beforeAll(async ({ request }) => {
    loginPage = new LoginPage(request);
    await loginPage.register({ username: testUser, password: testPassword });
    await loginPage.login(testUser, testPassword);
    articlePage = new ArticlePage(request, loginPage.getAuthHeaders());
  });

  test.afterAll(async ({ request }) => {
    // 清理创建的测试文章
    const ap = new ArticlePage(request, loginPage.getAuthHeaders());
    for (const id of createdArticleIds) {
      try { await ap.delete(id); } catch {}
    }
  });

  test.describe('GET /api/articles', () => {
    test('应返回已发布文章列表', async () => {
      const { status, body } = await articlePage.getList();
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    test('按标签筛选', async () => {
      const { status, body } = await articlePage.getList({ tag: 'nonexistent' });
      expect(status).toBe(200);
      expect(body.length).toBe(0);
    });
  });

  test.describe('POST /api/articles', () => {
    test('创建文章', async () => {
      const { status, body } = await articlePage.create({
        title: 'E2E Test Article',
        content: 'This is an E2E test article content.',
        summary: 'E2E summary',
      });

      expect(status).toBe(200);
      expect(body).toHaveProperty('id');
      expect(body.message).toBe('文章创建成功');
      createdArticleIds.push(body.id);
    });

    test('无需标题应返回 400', async () => {
      const { status } = await articlePage.create({
        title: '',
        content: 'Content without title',
      });

      expect(status).toBe(400);
    });
  });

  test.describe('GET /api/articles/:id', () => {
    test('查看文章详情', async () => {
      // 先创建文章
      const { body: created } = await articlePage.create({
        title: 'Detail Test Article',
        content: 'Detail content for testing.',
      });
      createdArticleIds.push(created.id);

      const { status, body } = await articlePage.getDetail(created.id);
      expect(status).toBe(200);
      expect(body.title).toBe('Detail Test Article');
      expect(body).toHaveProperty('content');
      expect(body).toHaveProperty('author_name');
    });

    test('不存在的文章应返回 404', async () => {
      const { status } = await articlePage.getDetail(99999);
      expect(status).toBe(404);
    });
  });

  test.describe('PUT /api/articles/:id', () => {
    test('更新文章', async () => {
      const { body: created } = await articlePage.create({
        title: 'Before Update',
        content: 'Original content.',
      });
      createdArticleIds.push(created.id);

      const { status, body } = await articlePage.update(created.id, {
        title: 'After Update',
        content: 'Updated content.',
      });

      expect(status).toBe(200);
      expect(body.message).toBe('文章更新成功');
    });
  });

  test.describe('DELETE /api/articles/:id', () => {
    test('删除文章', async () => {
      const { body: created } = await articlePage.create({
        title: 'To Be Deleted',
        content: 'Delete me.',
      });

      const { status, body } = await articlePage.delete(created.id);
      expect(status).toBe(200);
      expect(body.message).toBe('文章删除成功');
    });
  });

  test.describe('草稿功能', () => {
    test('保存草稿', async () => {
      const { status, body } = await articlePage.saveDraft({
        title: 'Draft Article',
        content: 'Draft content.',
      });

      expect(status).toBe(200);
      expect(body.message).toBe('草稿已保存');
      createdArticleIds.push(body.id);
    });

    test('获取草稿列表', async () => {
      await articlePage.saveDraft({
        title: 'Another Draft',
        content: 'More draft content.',
      });

      const { status, body } = await articlePage.getDrafts();
      expect(status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    test('发布草稿', async () => {
      const { body: draft } = await articlePage.saveDraft({
        title: 'Publishable Draft',
        content: 'Ready to publish.',
      });
      createdArticleIds.push(draft.id);

      const { status, body } = await articlePage.publishDraft(draft.id);
      expect(status).toBe(200);
      expect(body.message).toBe('发布成功');
    });
  });

  test.describe('置顶功能', () => {
    test('置顶和取消置顶文章', async () => {
      const { body: created } = await articlePage.create({
        title: 'Pin Test',
        content: 'Testing pin.',
      });
      createdArticleIds.push(created.id);

      // 置顶
      const { status: pinStatus, body: pinBody } = await articlePage.togglePin(created.id);
      expect(pinStatus).toBe(200);
      expect(pinBody.is_pinned).toBe(1);

      // 取消置顶
      const { status: unpinStatus, body: unpinBody } = await articlePage.togglePin(created.id);
      expect(unpinStatus).toBe(200);
      expect(unpinBody.is_pinned).toBe(0);
    });
  });
});
