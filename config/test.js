// config/test.js - 测试环境配置
module.exports = {
  server: {
    nodeEnv: 'test',
  },
  database: {
    url: 'postgresql://postgres:123456@localhost:5432/blog_test?schema=public',
  },
  redis: {
    skip: true,
  },
  log: {
    level: 'silent',
  },
  jwt: {
    secret: 'test-secret-key-2024',
  },
};
