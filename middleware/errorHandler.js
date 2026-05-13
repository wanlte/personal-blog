// middleware/errorHandler.js
// 全局错误处理中间件
const config = require('../config');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// ============ 自定义错误类 ============
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误工厂方法
AppError.badRequest = (message = '请求参数错误', details) =>
  new AppError(message, 400, 'BAD_REQUEST', details);

AppError.unauthorized = (message = '未授权访问', details) =>
  new AppError(message, 401, 'UNAUTHORIZED', details);

AppError.forbidden = (message = '权限不足', details) =>
  new AppError(message, 403, 'FORBIDDEN', details);

AppError.notFound = (message = '资源不存在', details) =>
  new AppError(message, 404, 'NOT_FOUND', details);

AppError.conflict = (message = '资源冲突', details) =>
  new AppError(message, 409, 'CONFLICT', details);

AppError.tooManyRequests = (message = '请求过于频繁', details) =>
  new AppError(message, 429, 'TOO_MANY_REQUESTS', details);

AppError.internal = (message = '服务器内部错误', details) =>
  new AppError(message, 500, 'INTERNAL_ERROR', details);

// ============ 统一错误响应格式 ============
function formatErrorResponse(err, requestId) {
  const config = require('../config');
  const isDev = config.server.nodeEnv === 'development';

  // ——— express-validator 验证错误 ———
  // 情况1: err.errors 数组（express-validator 的 .throw() 模式或 manual pass）
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '请求参数验证失败',
        details: err.errors.map((e) => ({
          field: e.path || e.param,
          location: e.location,
          message: e.msg,
          value: e.value,
        })),
      },
      requestId,
    };
  }

  // 情况2: err.array() 方法（express-validator Result 对象）
  if (typeof err.array === 'function') {
    const validationErrors = err.array();
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: validationErrors.map((e) => ({
            field: e.path || e.param,
            location: e.location,
            message: e.msg,
            value: e.value,
          })),
        },
        requestId,
      };
    }
  }

  // ——— Prisma 数据库错误 ———
  if (err.name?.startsWith('PrismaClient')) {
    return handlePrismaError(err, requestId, isDev);
  }

  // ——— JWT 认证错误 ———
  if (
    err.name === 'JsonWebTokenError' ||
    err.name === 'TokenExpiredError' ||
    err.name === 'NotBeforeError'
  ) {
    const messages = {
      JsonWebTokenError: '认证令牌无效',
      TokenExpiredError: '认证令牌已过期',
      NotBeforeError: '认证令牌尚未生效',
    };
    return {
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: messages[err.name] || '认证失败',
        details: isDev ? err.message : undefined,
      },
      requestId,
    };
  }

  // ——— 自定义 AppError ———
  if (err instanceof AppError) {
    return {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
      requestId,
    };
  }

  // ——— 未知错误 ———
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? err.message : '服务器内部错误，请稍后重试',
      ...(isDev && { stack: err.stack }),
    },
    requestId,
  };
}

// 处理 Prisma 错误（按错误码返回中文提示）
function handlePrismaError(err, requestId, isDev) {
  const base = { success: false, requestId };
  const code = err.code;

  const knownCodes = {
    P2002: { status: 409, message: '数据已存在，请检查唯一字段' },
    P2025: { status: 404, message: '请求的资源不存在' },
    P2003: { status: 400, message: '关联数据不存在，请检查外键约束' },
    P2014: { status: 400, message: '数据关联违规' },
    P2016: { status: 404, message: '查询结果不存在' },
    P2018: { status: 404, message: '关联资源不存在' },
  };

  const mapped = knownCodes[code];
  if (mapped) {
    return {
      ...base,
      error: {
        code: 'DATABASE_ERROR',
        message: mapped.message,
        details: isDev ? { prismaCode: code, meta: err.meta } : undefined,
      },
    };
  }

  return {
    ...base,
    error: {
      code: 'DATABASE_ERROR',
      message: '数据库操作失败',
      details: isDev ? { prismaCode: code, message: err.message } : undefined,
    },
  };
}

// 根据错误类型推断 HTTP 状态码
function getErrorStatusCode(err) {
  if (err.statusCode || err.status) {
    return err.statusCode || err.status;
  }

  // JWT 错误 → 401
  if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err.name)) {
    return 401;
  }

  // express-validator 错误 → 400
  if ((Array.isArray(err.errors) && err.errors.length > 0) || typeof err.array === 'function') {
    return 400;
  }

  // Prisma 错误 → 根据错误码映射
  if (err.name?.startsWith('PrismaClient')) {
    if (err.code === 'P2002') return 409;
    if (['P2025', 'P2016', 'P2018'].includes(err.code)) return 404;
    if (['P2003', 'P2014'].includes(err.code)) return 400;
    return 500;
  }

  return 500;
}

// ============ 全局错误处理中间件 ============
function globalErrorHandler(err, req, res, _next) {
  const requestId = req.headers['x-request-id'] || req.requestId || uuidv4();
  req.requestId = requestId;

  const statusCode = getErrorStatusCode(err);

  // 日志
  const logData = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.socket?.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    statusCode,
    errorName: err.name,
    errorMessage: err.message,
    stack: config.server.nodeEnv !== 'production' ? err.stack : undefined,
  };

  if (statusCode >= 500) {
    logger.error('服务器错误', logData);
  } else {
    logger.warn('客户端错误', logData);
  }

  res.setHeader('X-Request-ID', requestId);
  res.status(statusCode).json(formatErrorResponse(err, requestId));
}

// ============ 异步错误包装器 ============
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============ 404 路由未找到 ============
function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`路由 ${req.method} ${req.originalUrl} 不存在`));
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  formatErrorResponse,
};
