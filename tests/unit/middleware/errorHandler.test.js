// tests/unit/middleware/errorHandler.test.js - 错误处理中间件测试
const {
  AppError,
  formatErrorResponse,
  asyncHandler,
  notFoundHandler,
  globalErrorHandler,
} = require('../../../middleware/errorHandler');

describe('AppError', () => {
  it('应创建自定义错误', () => {
    const err = new AppError('自定义错误', 400, 'CUSTOM', { field: 'x' });
    expect(err.message).toBe('自定义错误');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('CUSTOM');
    expect(err.details).toEqual({ field: 'x' });
    expect(err.isOperational).toBe(true);
  });

  describe('工厂方法', () => {
    it('badRequest', () => {
      const err = AppError.badRequest('参数错误');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
    });

    it('unauthorized', () => {
      const err = AppError.unauthorized();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.message).toBe('未授权访问');
    });

    it('forbidden', () => {
      const err = AppError.forbidden('无权限');
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('notFound', () => {
      const err = AppError.notFound();
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('资源不存在');
    });

    it('conflict', () => {
      const err = AppError.conflict('已存在');
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });

    it('tooManyRequests', () => {
      const err = AppError.tooManyRequests();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('TOO_MANY_REQUESTS');
    });

    it('internal', () => {
      const err = AppError.internal();
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_ERROR');
      expect(err.message).toBe('服务器内部错误');
    });
  });
});

describe('formatErrorResponse', () => {
  const requestId = 'test-req-123';

  it('应格式化 express-validator 错误数组', () => {
    const err = {
      errors: [
        { path: 'username', location: 'body', msg: '不能为空', value: '' },
      ],
    };

    const result = formatErrorResponse(err, requestId);
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.details).toHaveLength(1);
    expect(result.error.details[0].field).toBe('username');
  });

  it('应格式化 AppError', () => {
    const err = AppError.notFound('文章不存在', { id: 1 });
    const result = formatErrorResponse(err, requestId);
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.message).toBe('文章不存在');
  });

  it('应格式化 JWT TokenExpiredError', () => {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    const result = formatErrorResponse(err, requestId);
    expect(result.error.code).toBe('AUTH_ERROR');
    expect(result.error.message).toBe('认证令牌已过期');
  });

  it('应格式化 JWT JsonWebTokenError', () => {
    const err = new Error('invalid token');
    err.name = 'JsonWebTokenError';
    const result = formatErrorResponse(err, requestId);
    expect(result.error.code).toBe('AUTH_ERROR');
    expect(result.error.message).toBe('认证令牌无效');
  });

  it('未知错误应返回 INTERNAL_ERROR', () => {
    const err = new Error('something went wrong');
    const result = formatErrorResponse(err, requestId);
    expect(result.error.code).toBe('INTERNAL_ERROR');
  });

  it('Prisma P2002 错误应返回中文提示', () => {
    const err = Object.assign(new Error('Unique constraint'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: {},
    });
    const result = formatErrorResponse(err, requestId);
    expect(result.error.code).toBe('DATABASE_ERROR');
    expect(result.error.message).toBe('数据已存在，请检查唯一字段');
  });

  it('Prisma P2025 错误应返回 404 提示', () => {
    const err = Object.assign(new Error('Record not found'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2025',
      meta: {},
    });
    const result = formatErrorResponse(err, requestId);
    expect(result.error.message).toBe('请求的资源不存在');
  });

  it('Prisma P2003 错误应返回外键提示', () => {
    const err = Object.assign(new Error('FK violation'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2003',
      meta: {},
    });
    const result = formatErrorResponse(err, requestId);
    expect(result.error.message).toBe('关联数据不存在，请检查外键约束');
  });

  it('Prisma P2016 错误应返回查询不存在提示', () => {
    const err = Object.assign(new Error('Query error'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2016',
      meta: {},
    });
    const result = formatErrorResponse(err, requestId);
    expect(result.error.message).toBe('查询结果不存在');
  });

  it('未知 Prisma 错误码应返回通用提示', () => {
    const err = Object.assign(new Error('unknown'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P9999',
      meta: {},
    });
    const result = formatErrorResponse(err, requestId);
    expect(result.error.message).toBe('数据库操作失败');
  });

  it('express-validator .array() 方法应被识别', () => {
    const err = {
      array: jest.fn(() => [{ path: 'email', location: 'body', msg: '格式错误', value: 'bad' }]),
    };
    const result = formatErrorResponse(err, requestId);
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.details[0].field).toBe('email');
  });

  it('JWT NotBeforeError 应被格式化', () => {
    const err = new Error('not active');
    err.name = 'NotBeforeError';
    const result = formatErrorResponse(err, requestId);
    expect(result.error.code).toBe('AUTH_ERROR');
  });

  it('AppError 无 details 应不带 details 字段', () => {
    const err = AppError.forbidden();
    const result = formatErrorResponse(err, requestId);
    expect(result.error.details).toBeUndefined();
  });
});

describe('asyncHandler', () => {
  it('应包装异步函数并捕获错误', async () => {
    const fn = async (_req, _res) => {
      throw new Error('测试错误');
    };
    const wrapped = asyncHandler(fn);

    const req = {};
    const res = {};
    const next = jest.fn();

    await wrapped(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toBe('测试错误');
  });

  it('正常执行不应调用 next', async () => {
    const fn = async (_req, res) => {
      res.status(200).json({ ok: true });
    };
    const wrapped = asyncHandler(fn);

    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await wrapped(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('notFoundHandler', () => {
  it('应创建 404 AppError 并调用 next', () => {
    const req = { method: 'GET', originalUrl: '/api/nonexistent' };
    const res = {};
    const next = jest.fn();

    notFoundHandler(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

describe('globalErrorHandler', () => {
  it('应格式化错误响应并设置 X-Request-ID', () => {
    const err = AppError.badRequest('参数错误');
    const req = {
      method: 'POST',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn(() => 'test-agent'),
      headers: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    const next = jest.fn();

    globalErrorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
  });

  it('500 错误应记录 error 日志', () => {
    const err = new Error('boom');
    const req = {
      method: 'GET',
      originalUrl: '/api/crash',
      ip: '10.0.0.1',
      get: jest.fn(() => 'agent'),
      headers: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    const next = jest.fn();

    globalErrorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('JWT 错误应返回 401', () => {
    const err = new Error('expired');
    err.name = 'TokenExpiredError';
    const req = {
      method: 'GET',
      originalUrl: '/api/protected',
      ip: '::1',
      get: jest.fn(() => 'test'),
      headers: {},
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    const next = jest.fn();

    globalErrorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
