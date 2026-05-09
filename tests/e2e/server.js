// tests/e2e/server.js - E2E 测试专用服务器（供 Playwright webServer 使用）
// 在测试数据库上启动 Express 应用

process.env.SKIP_REDIS = 'true';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  || 'postgresql://postgres:123456@localhost:5432/blog_test?schema=public';
process.env.JWT_SECRET = 'test-secret-key-2024';

const app = require('../app');
const PORT = process.env.E2E_PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`E2E test server running on http://localhost:${PORT}`);
  if (process.send) process.send('ready');
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
