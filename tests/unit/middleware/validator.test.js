// tests/unit/middleware/validator.test.js - 请求参数验证中间件测试

// 使用 jest.mock 替换 validationResult，保留其他 chain 函数的真实实现
jest.mock('express-validator', () => {
  const actual = jest.requireActual('express-validator');
  return {
    ...actual,
    validationResult: jest.fn(),
  };
});

const { validationResult } = require('express-validator');
const {
  validate,
  registerRules,
  loginRules,
  articleRules,
  commentRules,
  idParamRule,
  paginationRules,
} = require('../../../middleware/validator');

// Mock uuid 避免 ESM 问题（errorHandler require uuid）
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }), { virtual: true });

describe('validator rules', () => {
  describe('registerRules', () => {
    it('应包含 username 和 password 验证规则', () => {
      expect(registerRules.length).toBeGreaterThan(2);
      expect(typeof registerRules[registerRules.length - 1]).toBe('function');
    });
  });

  describe('loginRules', () => {
    it('应包含 username 和 password 验证规则', () => {
      expect(loginRules.length).toBe(3);
    });
  });

  describe('articleRules', () => {
    it('应包含 title, content, summary 验证规则', () => {
      expect(articleRules.length).toBe(4);
    });
  });

  describe('commentRules', () => {
    it('应包含 content 验证规则', () => {
      expect(commentRules.length).toBeGreaterThan(1);
    });
  });

  describe('idParamRule', () => {
    it('应包含 id 参数验证规则', () => {
      expect(idParamRule.length).toBe(2);
    });
  });

  describe('paginationRules', () => {
    it('应包含 page 和 limit 验证规则', () => {
      expect(paginationRules.length).toBe(3);
    });
  });
});

describe('validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('无验证错误时应调用 next（无参数）', () => {
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const req = {};
    const res = {};
    const next = jest.fn();

    validate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it('有验证错误时应调用 next(error) 传入 AppError', () => {
    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [
        { path: 'username', location: 'body', msg: '用户名为必填项', value: '' },
      ],
    });

    const req = {};
    const res = {};
    const next = jest.fn();

    validate(req, res, next);
    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('请求参数验证失败');
  });
});
