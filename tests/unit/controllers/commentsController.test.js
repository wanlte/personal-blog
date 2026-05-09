// tests/unit/controllers/commentsController.test.js - 评论控制器单元测试

jest.mock('../../../db/index', () => ({
  article: {
    findUnique: jest.fn(),
  },
  comment: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
}));

const prisma = require('../../../db/index');
const jwt = require('jsonwebtoken');
const {
  createComment,
  getComments,
  deleteComment,
} = require('../../../controllers/commentsController');

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = function (code) { this.statusCode = code; return this; };
  res.json = function (body) { this.body = body; return this; };
  return res;
}

describe('createComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('内容为空应返回 400', async () => {
    const req = { params: { id: '1' }, body: { content: '' }, headers: {} };
    const res = mockRes();
    await createComment(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('文章不存在应返回 404', async () => {
    prisma.article.findUnique.mockResolvedValue(null);
    const req = { params: { id: '999' }, body: { content: 'Nice!' }, headers: {} };
    const res = mockRes();
    await createComment(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('父评论不存在应返回 404', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1 });
    prisma.comment.findUnique.mockResolvedValue(null);
    const req = {
      params: { id: '1' },
      body: { content: 'Reply', parentId: '999' },
      headers: {},
    };
    const res = mockRes();
    await createComment(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('应创建匿名评论', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1 });
    prisma.comment.create.mockResolvedValue({
      id: 10, content: 'Great!', userName: '匿名', parentId: null, createdAt: new Date(),
    });
    const req = {
      params: { id: '1' },
      body: { content: 'Great!', userName: '' },
      headers: {},
    };
    const res = mockRes();
    await createComment(req, res);
    expect(res.body.id).toBe(10);
    expect(res.body.user_name).toBe('匿名');
  });

  it('token 有效时应使用登录用户信息', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: 1 });
    jwt.decode.mockReturnValue({ userId: 5, username: 'eggie' });
    prisma.comment.create.mockResolvedValue({
      id: 11, content: 'Hi', userName: 'eggie', parentId: null, createdAt: new Date(),
    });
    const req = {
      params: { id: '1' },
      body: { content: 'Hi' },
      headers: { authorization: 'Bearer valid.token' },
    };
    const res = mockRes();
    await createComment(req, res);
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 5, userName: 'eggie' }) })
    );
  });
});

describe('getComments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('应返回文章评论列表', async () => {
    prisma.comment.findMany.mockResolvedValue([
      { id: 1, content: 'Nice', articleId: 1, userId: 2, userName: 'u1', parentId: null, createdAt: new Date(), user: { username: 'avatar1' } },
    ]);
    const req = { params: { id: '1' } };
    const res = mockRes();
    await getComments(req, res);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].content).toBe('Nice');
  });

  it('数据库错误应返回 500', async () => {
    prisma.comment.findMany.mockRejectedValue(new Error('DB error'));
    const req = { params: { id: '1' } };
    const res = mockRes();
    await getComments(req, res);
    expect(res.statusCode).toBe(500);
  });
});

describe('deleteComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('评论不存在应返回 404', async () => {
    prisma.comment.findUnique.mockResolvedValue(null);
    const req = { params: { id: '999' }, user: { userId: 1 } };
    const res = mockRes();
    await deleteComment(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('非作者应返回 403', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 1, userId: 2 });
    const req = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await deleteComment(req, res);
    expect(res.statusCode).toBe(403);
  });

  it('作者应能删除评论', async () => {
    prisma.comment.findUnique.mockResolvedValue({ id: 1, userId: 1 });
    prisma.comment.delete.mockResolvedValue({});
    const req = { params: { id: '1' }, user: { userId: 1 } };
    const res = mockRes();
    await deleteComment(req, res);
    expect(res.body.message).toBe('评论删除成功');
  });
});
