// tests/setup.js - 测试环境配置（setupFiles，无测试全局变量）
// 在所有模块加载前设置环境变量
process.env.SKIP_REDIS = 'true';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
    || 'postgresql://postgres:123456@localhost:5432/blog_test?schema=public';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
