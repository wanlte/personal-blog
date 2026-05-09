// tests/unit/controllers/articlesController.test.js - 文章控制器单元测试

jest.mock('../../../db/index', () => ({
  article: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  articleLike: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  articleCollection: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  userFollow: {
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  tag: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  articleTag: {
    create: jest.fn(),
  },
}));

jest.mock('../../../middleware/cache', () => ({
  clearArticleCache: jest.fn(),
  clearTagCache: jest.fn(),
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  CACHE_KEYS: { ARTICLES_LIST: 'x', ARTICLE_POPULAR: 'y', ARTICLE_DETAIL: () => 'z' },
  CACHE_TTL: {},
}));

const prisma = require('../../../db/index');
const {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  pinArticle,
  saveDraft,
  getDrafts,
  publishDraft,
} = require('../../../controllers/articlesController');

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = function (code) { this.statusCode = code; return this; };
  res.json = function (body) { this.body = body; return this; };
  return res;
}

describe('getArticles', () => {
  beforeEach(() => jest.clearAllMocks());

  it('应返回已发布文章列表', async () => {
    prisma.article.findMany.mockResolvedValue([
      {
        id: 1, title: 'Article 1', content: 'c', summary: 's',
        userId: 1, status: 'published', isPinned: 0, isPaid: 0, price: 0,
        views: 10, createdAt: new Date(), updatedAt: new Date(),
        user: { username: 'author1' },
        _count: { likes: 2, collections: 1 },
      },
    ]);
    prisma.articleLike.findMany.mockResolvedValue([]);
    prisma.articleCollection.findMany.mockResolvedValue([]);

    const req = { query: {}, user: null };
    const res = mockRes();
    await getArticles(req, res);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Article 1');
  });

  it('应按标签筛选', async () => {
    prisma.article.findMany.mockResolvedValue([]);
    const req = { query: { tag: 'javascript' }, user: null };
    const res = mockRes();
    await getArticles(req, res);
    expect(prisma.article.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'published' }),
      })
    );
  });

  it('数据库错误应返回 500', async () => {
    prisma.article.findMany.mockRejectedValue(new Error('DB error'));
    const req = { query: {}, user: null };
    const res = mockRes();
    await getArticles(req, res);
    expect(res.statusCode).toBe(500);
  });
});

describe('getArticle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('文章不存在应返回 404', async () => {
    prisma.article.findUnique.mockResolvedValue(null);
    const req = { params: { id: '999' }, user: null };
    const res = mockRes();
    await getArticle(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('应返回文章详情并增加浏览量', async () => {
    prisma.article.findUnique.mockResolvedValue({
      id: 1, title: 'Hello', content: 'World', summary: '', userId: 2,
      views: 5, status: 'published', isPinned: 0, isPaid: 0, price: null,
      createdAt: new Date(), updatedAt: new Date(),
      user: { id: 2, username: 'author' },
      _count: { likes: 3, collections: 0 },
    });
    prisma.article.update.mockResolvedValue({});
    prisma.userFollow.count.mockResolvedValue(10);

    const req = { params: { id: '1' }, user: null };
    const res = mockRes();
    await getArticle(req, res);
    expect(res.body.title).toBe('Hello');
    expect(res.body.views).toBe(6);
  });
});

describe('createArticle', () => {
  it('标题为空应返回 400', async () => {
    const req = { body: { content: 'text' }, user: { userId: 1 } };
    const res = mockRes();
    await createArticle(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('应创建文章', async () => {
    prisma.article.create.mockResolvedValue({
      id: 10, title: 'New', content: 'Body', summary: '', views: 0,
    });
    const req = { body: { title: 'New', content: 'Body', summary: '' }, user: { userId: 1 } };
    const res = mockRes();
    await createArticle(req, res);
    expect(res.body.message).toBe('文章创建成功');
    expect(res.body.id).toBe(10);
  });
});

describe('updateArticle', () => {
  it('非作者应返回 403', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1, userId: 2 });
    const req = { params: { id: '1' }, body: { title: 'X', content: 'Y' }, user: { userId: 1 } };
    const res = mockRes();
    await updateArticle(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('作者应能更新文章', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1, userId: 1 });
    prisma.article.update.mockResolvedValue({});
    const req = { params: { id: '1' }, body: { title: 'Updated', content: 'New' }, user: { userId: 1 } };
    const res = mockRes();
    await updateArticle(req, res);
    expect(res.body.message).toBe('文章更新成功');
  });
});

describe('deleteArticle', () => {
  it('非作者应返回 403', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1, userId: 2 });
    const req = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await deleteArticle(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('作者应能删除文章', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1, userId: 1 });
    prisma.article.delete.mockResolvedValue({});
    const req = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await deleteArticle(req, res);
    expect(res.body.message).toBe('文章删除成功');
  });
});

describe('pinArticle', () => {
  it('应切换置顶状态', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1, userId: 1, isPinned: 0 });
    prisma.article.update.mockResolvedValue({});
    const req = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await pinArticle(req, res);
    expect(res.body.is_pinned).toBe(1);
    expect(res.body.message).toBe('文章已置顶');
  });

  it('应取消置顶', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1, userId: 1, isPinned: 1 });
    prisma.article.update.mockResolvedValue({});
    const req = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await pinArticle(req, res);
    expect(res.body.is_pinned).toBe(0);
  });
});

describe('saveDraft', () => {
  it('应保存草稿', async () => {
    prisma.article.create.mockResolvedValue({ id: 5 });
    const req = { body: { title: 'Draft', content: '' }, user: { userId: 1 } };
    const res = mockRes();
    await saveDraft(req, res);
    expect(res.body.message).toBe('草稿已保存');
    expect(res.body.id).toBe(5);
  });

  it('无标题应使用默认标题', async () => {
    prisma.article.create.mockResolvedValue({ id: 6 });
    const req = { body: { content: 'text' }, user: { userId: 1 } };
    const res = mockRes();
    await saveDraft(req, res);
    expect(prisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: '无标题' }) })
    );
  });
});

describe('getDrafts', () => {
  it('应返回用户的草稿列表', async () => {
    prisma.article.findMany.mockResolvedValue([{ id: 1, title: 'Draft1', status: 'draft' }]);
    const req = { user: { userId: 1 } };
    const res = mockRes();
    await getDrafts(req, res);
    expect(res.body).toHaveLength(1);
  });
});

describe('publishDraft', () => {
  it('应发布草稿', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1, userId: 1, status: 'draft' });
    prisma.article.update.mockResolvedValue({});
    const req = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await publishDraft(req, res);
    expect(res.body.message).toBe('发布成功');
  });

  it('非作者应返回 403', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1, userId: 2 });
    const req = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await publishDraft(req, res);
    expect(res.statusCode).toBe(403);
  });
});
