// tests/unit/controllers/authController.test.js - 认证控制器单元测试

// Mock 依赖
jest.mock('../../../db/index', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  subscriptionPlan: {
    findUnique: jest.fn(),
  },
  userSubscription: {
    create: jest.fn(),
  },
  paymentRecord: {
    create: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const prisma = require('../../../db/index');
const bcrypt = require('bcrypt');
const { register, login } = require('../../../controllers/authController');

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (body) {
    this.body = body;
    return this;
  };
  return res;
}

describe('register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('缺少用户名或密码应返回 400', async () => {
    const req = { body: { username: '', password: '' } };
    const res = mockRes();
    await register(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('用户名和密码不能为空');
  });

  it('密码少于 6 位应返回 400', async () => {
    const req = { body: { username: 'test', password: '12345' } };
    const res = mockRes();
    await register(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('密码长度不能少于6位');
  });

  it('用户名已存在应返回 400', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, username: 'test' });
    const req = { body: { username: 'test', password: 'Password1' } };
    const res = mockRes();
    await register(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('用户名已存在');
  });

  it('成功注册应返回 userId', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed_password');
    prisma.user.create.mockResolvedValue({ id: 42, username: 'newuser' });

    const req = { body: { username: 'newuser', password: 'StrongPwd1' } };
    const res = mockRes();
    await register(req, res);
    expect(res.body.message).toBe('注册成功');
    expect(res.body.userId).toBe(42);
    expect(res.body.subscription).toBeNull();
  });

  it('注册时可附带订阅方案', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed');
    prisma.user.create.mockResolvedValue({ id: 10, username: 'subber' });
    prisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 1,
      name: '月度会员',
      price: 9.9,
      durationDays: 30,
      isActive: true,
    });
    prisma.userSubscription.create.mockResolvedValue({});
    prisma.paymentRecord.create.mockResolvedValue({});

    const req = { body: { username: 'subber', password: 'StrongPwd1', planId: '1' } };
    const res = mockRes();
    await register(req, res);
    expect(res.body.subscription).toHaveProperty('planName', '月度会员');
  });

  it('数据库错误应返回 500', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('DB down'));
    const req = { body: { username: 'test', password: 'StrongPwd1' } };
    const res = mockRes();
    await register(req, res);
    expect(res.statusCode).toBe(500);
  });
});

describe('login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('缺少凭据应返回 400', async () => {
    const req = { body: {} };
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(400);
  });

  it('用户不存在应返回 401', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const req = { body: { username: 'ghost', password: 'password' } };
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('用户名或密码错误');
  });

  it('密码错误应返回 401', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, username: 'user', password: 'hash' });
    bcrypt.compare.mockResolvedValue(false);
    const req = { body: { username: 'user', password: 'wrong' } };
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('登录成功应返回 token 和用户信息', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 7, username: 'loginer', password: 'hash' });
    bcrypt.compare.mockResolvedValue(true);
    const req = { body: { username: 'loginer', password: 'right' } };
    const res = mockRes();
    await login(req, res);
    expect(res.body.message).toBe('登录成功');
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toEqual({ id: 7, username: 'loginer' });
  });

  it('服务器错误应返回 500', async () => {
    prisma.user.findUnique.mockRejectedValue(new Error('DB error'));
    const req = { body: { username: 'user', password: 'pwd' } };
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(500);
  });
});
