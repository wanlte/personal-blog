// tests/unit/middleware/auth.test.js - 认证中间件测试
const jwt = require('jsonwebtoken');
const { authenticateToken, optionalAuth, JWT_SECRET } = require('../../../middleware/auth');

function mockReq(headers = {}) {
  return { headers };
}

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

describe('authenticateToken', () => {
  it('无 token 应返回 401', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: '请先登录' });
    expect(next).not.toHaveBeenCalled();
  });

  it('合法 token 应设置 req.user 并调用 next', () => {
    const token = jwt.sign({ userId: 1, username: 'tester' }, JWT_SECRET, { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toHaveProperty('userId', 1);
    expect(req.user).toHaveProperty('username', 'tester');
  });

  it('无效 token 应返回 403', () => {
    const req = mockReq({ authorization: 'Bearer invalid.token.here' });
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: '登录已过期，请重新登录' });
    expect(next).not.toHaveBeenCalled();
  });

  it('过期 token 应返回 403', () => {
    const expiredToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '0s' });
    // 等待 token 过期
    const req = mockReq({ authorization: `Bearer ${expiredToken}` });
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('Bearer 多空格时 token 为空应返回 401', () => {
    const token = jwt.sign({ userId: 2, username: 'foo' }, JWT_SECRET, { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer  ${token}` });
    const res = mockRes();
    const next = jest.fn();

    authenticateToken(req, res, next);
    // split(' ')[1] 得到 ''（falsy），走 !token 分支 → 401
    expect(res.statusCode).toBe(401);
  });
});

describe('optionalAuth', () => {
  it('无 token 应设置 req.user=null 并调用 next', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    optionalAuth(req, res, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  it('合法 token 应设置 req.user', () => {
    const token = jwt.sign({ userId: 3, username: 'opt' }, JWT_SECRET, { expiresIn: '1h' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();

    optionalAuth(req, res, next);
    expect(req.user).toHaveProperty('userId', 3);
    expect(req.user).toHaveProperty('username', 'opt');
    expect(next).toHaveBeenCalled();
  });

  it('无效 token 应设置 req.user=null 并继续', () => {
    const req = mockReq({ authorization: 'Bearer garbage.token.xyz' });
    const res = mockRes();
    const next = jest.fn();

    optionalAuth(req, res, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  it('过期 token 应设置 req.user=null 并继续', () => {
    const expiredToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '0s' });
    const req = mockReq({ authorization: `Bearer ${expiredToken}` });
    const res = mockRes();
    const next = jest.fn();

    optionalAuth(req, res, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });
});

describe('JWT_SECRET', () => {
  it('应导出 JWT_SECRET 常量', () => {
    expect(JWT_SECRET).toBe('your-secret-key-2024');
  });
});
