// tests/setup.js - 测试环境配置（setupFiles，无测试全局变量）
// 在所有模块加载前设置环境变量
process.env.SKIP_REDIS = 'true';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    || 'postgresql://postgres:123456@localhost:5432/blog_test?schema=public';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_POOL_SIZE = '10';
process.env.DATABASE_CONNECTION_TIMEOUT = '10000';
process.env.JWT_SECRET = 'your-secret-key-2024';
process.env.ENCRYPTION_KEY = 'v1:test1234test1234test1234test1234test1234test1234test1234test1234';
process.env.ENCRYPTION_IV = 'test_iv_2026_test_encryption_iv_';
