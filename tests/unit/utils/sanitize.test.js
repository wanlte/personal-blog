// tests/unit/utils/sanitize.test.js - 安全工具函数测试
const {
  sanitizeHtml,
  escapeRegex,
  validateEmail,
  generateSlug,
} = require('../../../utils/sanitize');

describe('sanitizeHtml', () => {
  it('应转义 HTML 特殊字符', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('应转义单引号', () => {
    expect(sanitizeHtml("it's")).toBe('it&#x27;s');
  });

  it('应转义 & 符号', () => {
    expect(sanitizeHtml('a & b')).toBe('a &amp; b');
  });

  it('非字符串应返回空字符串', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml(123)).toBe('');
  });

  it('纯文本应原样返回', () => {
    expect(sanitizeHtml('hello world')).toBe('hello world');
  });
});

describe('escapeRegex', () => {
  it('应转义正则表达式特殊字符', () => {
    expect(escapeRegex('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o')).toBe(
      'a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o'
    );
  });

  it('非字符串应返回空字符串', () => {
    expect(escapeRegex(null)).toBe('');
    expect(escapeRegex(undefined)).toBe('');
    expect(escapeRegex(123)).toBe('');
  });

  it('普通字符串应原样返回', () => {
    expect(escapeRegex('hello world')).toBe('hello world');
  });
});

describe('validateEmail', () => {
  it('合法邮箱应返回 true', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@sub.domain.co')).toBe(true);
  });

  it('不含 @ 符号应返回 false', () => {
    expect(validateEmail('testexample.com')).toBe(false);
  });

  it('空字符串应返回 false', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('非字符串应返回 false', () => {
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(123)).toBe(false);
  });

  it('前后空格应被 trim 处理', () => {
    expect(validateEmail('  test@example.com  ')).toBe(true);
  });

  it('缺少域名的邮箱应返回 false', () => {
    expect(validateEmail('test@')).toBe(false);
  });

  it('缺少用户名的邮箱应返回 false', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });
});

describe('generateSlug', () => {
  it('英文标题应生成小写连字符 slug', () => {
    expect(generateSlug('Hello World Blog')).toBe('hello-world-blog');
  });

  it('应移除特殊字符并替换为连字符', () => {
    expect(generateSlug('Hello, World! Blog?')).toBe('hello-world-blog');
  });

  it('中文字符应被移除，用 hash 回退', () => {
    const slug = generateSlug('你好世界');
    expect(slug).toMatch(/^post-[a-f0-9]{8}$/);
  });

  it('中英混合标题应保留英文部分', () => {
    const slug = generateSlug('你好 Hello World 世界');
    expect(slug).toBe('hello-world');
  });

  it('超长标题应被截断', () => {
    const longTitle = 'a'.repeat(100);
    const slug = generateSlug(longTitle, 50);
    expect(slug.length).toBeLessThanOrEqual(50);
  });

  it('默认最大长度为 80', () => {
    const title = 'a'.repeat(100);
    const slug = generateSlug(title);
    expect(slug.length).toBeLessThanOrEqual(80);
  });

  it('非字符串应返回空字符串', () => {
    expect(generateSlug(null)).toBe('');
    expect(generateSlug(123)).toBe('');
  });

  it('应移除首尾连字符', () => {
    expect(generateSlug('---hello---')).toBe('hello');
  });

  it('连续特殊字符应合并为单个连字符', () => {
    expect(generateSlug('hello!!!world')).toBe('hello-world');
  });
});
