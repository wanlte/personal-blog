// tests/e2e/subscription.spec.js - 订阅流程 E2E 测试
const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');

test.describe('订阅流程 (subscription)', () => {
  let loginPage;
  let request;
  const testUser = `e2e_sub_${Date.now()}`;
  const testPassword = 'SubPass1!';

  test.beforeAll(async ({ request: req }) => {
    request = req;
    loginPage = new LoginPage(request);
    await loginPage.register({ username: testUser, password: testPassword });
    await loginPage.login(testUser, testPassword);
  });

  test.describe('GET /api/subscription/plans', () => {
    test('应返回订阅方案列表', async () => {
      const res = await request.get('/api/subscription/plans');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test.describe('GET /api/subscription/status', () => {
    test('未登录应返回 401', async () => {
      const res = await request.get('/api/subscription/status');
      expect(res.status()).toBe(401);
    });

    test('已登录应返回订阅状态', async () => {
      const headers = loginPage.getAuthHeaders();
      const res = await request.get('/api/subscription/status', { headers });
      expect(res.status()).toBe(200);
    });
  });

  test.describe('注册时附带订阅方案', () => {
    test('注册 + 自动开通订阅', async () => {
      // 获取方案
      const plansRes = await request.get('/api/subscription/plans');
      const plans = await plansRes.json();

      if (plans.length > 0) {
        const planId = plans[0].id;
        const subUser = `e2e_subreg_${Date.now()}`;
        const { status, body } = await loginPage.register({
          username: subUser,
          password: 'SubReg123!',
          planId,
        });

        expect(status).toBe(200);
        expect(body.subscription).not.toBeNull();
        expect(body.subscription).toHaveProperty('planName');
        expect(body.subscription).toHaveProperty('endDate');
      }
    });
  });

  test.describe('POST /api/subscription/subscribe', () => {
    test('订阅方案', async () => {
      const plansRes = await request.get('/api/subscription/plans');
      const plans = await plansRes.json();

      if (plans.length > 0) {
        const headers = loginPage.getAuthHeaders();
        const res = await request.post('/api/subscription/subscribe', {
          headers,
          data: { planId: plans[0].id },
        });

        expect(res.status()).toBe(200);
      }
    });

    test('无 token 应返回 401', async () => {
      const plansRes = await request.get('/api/subscription/plans');
      const plans = await plansRes.json();

      if (plans.length > 0) {
        const res = await request.post('/api/subscription/subscribe', {
          data: { planId: plans[0].id },
        });
        expect(res.status()).toBe(401);
      }
    });
  });

  test.describe('POST /api/subscription/cancel', () => {
    test('取消订阅', async () => {
      const headers = loginPage.getAuthHeaders();
      const res = await request.post('/api/subscription/cancel', { headers });
      // 可能成功或返回无订阅状态
      expect([200, 400]).toContain(res.status());
    });
  });

  test.describe('GET /api/subscription/history', () => {
    test('已登录应返回订阅历史', async () => {
      const headers = loginPage.getAuthHeaders();
      const res = await request.get('/api/subscription/history', { headers });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  test.describe('仪表盘健康检查', () => {
    test('数据库健康检查', async () => {
      const res = await request.get('/api/health/db');
      expect(res.status() === 200 || res.status() === 503).toBe(true);
    });
  });
});
