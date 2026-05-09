// tests/unit/utils/response.test.js - 统一响应格式测试
const {
  success,
  error,
  paginated,
  created,
  noContent,
} = require('../../../utils/response');

// 构建 mock response 对象
function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (body) {
    this.body = body;
    return this;
  };
  res.send = function () {
    return this;
  };
  return res;
}

describe('success', () => {
  it('默认状态码为 200', () => {
    const res = mockRes();
    success(res, { id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: 1 });
    expect(res.body.message).toBe('操作成功');
  });

  it('应包含 ISO 时间戳', () => {
    const res = mockRes();
    success(res, null);
    expect(res.body.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it('可自定义状态码和信息', () => {
    const res = mockRes();
    success(res, { name: 'test' }, '创建成功', 201);
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('创建成功');
    expect(res.body.data).toEqual({ name: 'test' });
  });
});

describe('error', () => {
  it('默认状态码为 500', () => {
    const res = mockRes();
    error(res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('服务器错误');
  });

  it('可包含详细错误信息', () => {
    const res = mockRes();
    error(res, '未找到', 404, [{ field: 'id', message: '无效' }]);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('未找到');
    expect(res.body.errors).toEqual([{ field: 'id', message: '无效' }]);
  });

  it('错误时 data 应为 null', () => {
    const res = mockRes();
    error(res, '错误', 400);
    expect(res.body.data).toBeNull();
  });
});

describe('paginated', () => {
  it('应包含完整分页信息', () => {
    const res = mockRes();
    paginated(res, [{ id: 1 }], 2, 50, 10);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: 1 }]);
    expect(res.body.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 50,
      totalPages: 5,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('最后一页 hasNext 应为 false', () => {
    const res = mockRes();
    paginated(res, [], 5, 50, 10);
    expect(res.body.pagination.hasNext).toBe(false);
  });

  it('第一页 hasPrev 应为 false', () => {
    const res = mockRes();
    paginated(res, [], 1, 50, 10);
    expect(res.body.pagination.hasPrev).toBe(false);
  });

  it('默认 pageSize 应为 20', () => {
    const res = mockRes();
    paginated(res, [], 1, 10);
    expect(res.body.pagination.pageSize).toBe(20);
  });

  it('空数据时 totalPages 至少为 1', () => {
    const res = mockRes();
    paginated(res, [], 1, 0);
    expect(res.body.pagination.totalPages).toBe(1);
  });
});

describe('created', () => {
  it('应返回 201 状态码', () => {
    const res = mockRes();
    created(res, { id: 1 });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: 1 });
  });
});

describe('noContent', () => {
  it('应返回 204 状态码且无 body', () => {
    const res = mockRes();
    noContent(res);
    expect(res.statusCode).toBe(204);
  });
});
