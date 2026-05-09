// playwright.config.js - Playwright E2E 测试配置
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // 全局超时
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  // 测试目录
  testDir: './tests/e2e',

  // 失败重试
  retries: 2,

  // 并行 worker 数
  workers: 1,

  // 报告器
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  // 全局配置
  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  // Web 服务器（自动启动/停止）
  webServer: {
    command: 'node tests/e2e/server.js',
    url: 'http://localhost:3001/api/health/db',
    timeout: 15000,
    reuseExistingServer: !process.env.CI,
    cwd: '.',
  },
});
