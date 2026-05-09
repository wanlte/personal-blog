// jest.config.js - Jest 测试配置
module.exports = {
  setupFiles: ['./tests/setup.js'],
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,

  // 覆盖率配置
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/prisma/',
    '/config/',
    '/jobs/',
    '/strategies/',
    '/db/',
    '/utils/logger.js',
    '/utils/cache.js',
  ],
  coverageReporters: ['text', 'lcov', 'html'],

  // 测试文件匹配
  testMatch: ['**/tests/**/*.test.js'],

  // 模块路径别名（可选，方便测试中 require）
  moduleDirectories: ['node_modules', '<rootDir>'],

  // ESM 模块 mock 映射（避免 transform 报错）
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
  },
};
