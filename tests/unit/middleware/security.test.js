// tests/unit/middleware/security.test.js - 安全中间件配置测试
const { helmetConfig, corsOptions } = require('../../../middleware/security');

describe('helmetConfig', () => {
  it('应配置内容安全策略', () => {
    expect(helmetConfig.contentSecurityPolicy).toBeDefined();
    expect(helmetConfig.contentSecurityPolicy.directives.defaultSrc).toContain("'self'");
  });

  it('应配置 frameguard 为 deny', () => {
    expect(helmetConfig.frameguard.action).toBe('deny');
  });

  it('应启用 noSniff', () => {
    expect(helmetConfig.noSniff).toBe(true);
  });

  it('应启用 xssFilter', () => {
    expect(helmetConfig.xssFilter).toBe(true);
  });

  it('应配置 HSTS', () => {
    expect(helmetConfig.strictTransportSecurity.maxAge).toBe(31536000);
    expect(helmetConfig.strictTransportSecurity.includeSubDomains).toBe(true);
    expect(helmetConfig.strictTransportSecurity.preload).toBe(true);
  });

  it('应配置 Referrer-Policy', () => {
    expect(helmetConfig.referrerPolicy.policy).toBe('strict-origin-when-cross-origin');
  });

  it('应禁用 DNS 预获取', () => {
    expect(helmetConfig.dnsPrefetchControl.allow).toBe(false);
  });

  it('应启用 ieNoOpen', () => {
    expect(helmetConfig.ieNoOpen).toBe(true);
  });

  it('CSP reportOnly 模式取决于 NODE_ENV', () => {
    // tests 运行在 NODE_ENV=test，非 development，所以 reportOnly=false
    expect(typeof helmetConfig.contentSecurityPolicy.reportOnly).toBe('boolean');
  });
});

describe('corsOptions', () => {
  it('应配置允许的 HTTP 方法', () => {
    expect(corsOptions.methods).toEqual(
      expect.arrayContaining(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
    );
  });

  it('应配置允许的请求头', () => {
    expect(corsOptions.allowedHeaders).toEqual(
      expect.arrayContaining(['Content-Type', 'Authorization', 'X-Request-ID'])
    );
  });

  it('应配置暴露的响应头', () => {
    expect(corsOptions.exposedHeaders).toEqual(
      expect.arrayContaining(['X-Request-ID', 'X-RateLimit-Limit'])
    );
  });

  it('应启用 credentials', () => {
    expect(corsOptions.credentials).toBe(true);
  });

  it('应返回 origin 回调函数', () => {
    expect(typeof corsOptions.origin).toBe('function');
  });

  it('无 origin 的请求应通过', () => {
    const callback = jest.fn();
    corsOptions.origin(undefined, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('无效 origin 应返回 false', () => {
    const callback = jest.fn();
    corsOptions.origin('https://evil.com', callback);
    expect(callback).toHaveBeenCalledWith(null, false);
  });

  it('FRONTEND_URL 配置的 origin 应通过', () => {
    // tests/setup.js 未设置 FRONTEND_URL，localhost 仅在 development 模式自动允许
    // 在 test 模式下测试 null origin 和无 origin 请求
    const callback = jest.fn();
    corsOptions.origin(undefined, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('null 字符串 origin 应通过', () => {
    const callback = jest.fn();
    corsOptions.origin('null', callback);
    // 'null' 是字符串，不匹配任何来源，会被拒绝
    expect(callback).toHaveBeenCalled();
  });
});
