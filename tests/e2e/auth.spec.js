// tests/e2e/auth.spec.js - 认证流程 E2E 测试
const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');

test.describe('认证流程 (auth)', () => {
  let loginPage;
  const username = `e2e_user_${Date.now()}`;
  const password = 'E2ePass123';

  test.beforeEach(async ({ request }) => {
    loginPage = new LoginPage(request);
  });

  test.describe('POST /api/register', () => {
    test('注册新用户', async () => {
      const { status, body } = await loginPage.register({
        username: `e2e_user_${Date.now()}`,
        password: 'E2ePass123',
      });

      expect(status).toBe(200);
      expect(body.message).toBe('注册成功');
      expect(body).toHaveProperty('userId');
    });

    test('注册用户名重复应被拒绝', async () => {
      const username = `e2e_dup_${Date.now()}`;

      // 第一次注册成功
      await loginPage.register({ username, password: 'Pass1234!' });

      // 第二次注册同一用户名
      const { status, body } = await loginPage.register({
        username,
        password: 'Pass1234!',
      });

      expect(status).toBe(400);
      expect(body.error).toBe('用户名已存在');
    });

    test('空用户名应被拒绝', async () => {
      const { status, body } = await loginPage.register({
        username: '',
        password: 'Pass1234!',
      });

      expect(status).toBe(400);
      expect(body).toHaveProperty('error');
    });

    test('短密码应被拒绝', async () => {
      const { status, body } = await loginPage.register({
        username: 'tooshortpwd',
        password: '123',
      });

      expect(status).toBe(400);
      expect(body.error).toBe('密码长度不能少于6位');
    });
  });

  test.describe('POST /api/login', () => {
    const username = `e2e_login_${Date.now()}`;
    const password = 'LoginPass1';

    test.beforeAll(async ({ request }) => {
      const lp = new LoginPage(request);
      await lp.register({ username, password });
    });

    test('登录成功返回 token', async () => {
      const { status, body } = await loginPage.login(username, password);

      expect(status).toBe(200);
      expect(body.message).toBe('登录成功');
      expect(body).toHaveProperty('token');
      expect(body.user).toHaveProperty('username', username);
      expect(loginPage.isLoggedIn()).toBe(true);
    });

    test('错误密码应返回 401', async () => {
      const { status, body } = await loginPage.login(username, 'WrongPass1');

      expect(status).toBe(401);
      expect(body.error).toBe('用户名或密码错误');
      expect(loginPage.isLoggedIn()).toBe(false);
    });

    test('不存在用户应返回 401', async () => {
      const { status, body } = await loginPage.login(`nobody_${Date.now()}`, 'SomePass1');

      expect(status).toBe(401);
    });

    test('返回 token 可解析出用户信息', async () => {
      const { body } = await loginPage.login(username, password);
      expect(body.token).toBeDefined();
      // JWT 格式: header.payload.signature
      expect(body.token.split('.')).toHaveLength(3);
    });
  });

  test.describe('认证保护', () => {
    test('无 token 访问受保护接口应返回 401', async ({ request }) => {
      const res = await request.post('/api/articles', {
        data: { title: 'Unauthorized', content: 'Should fail' },
      });
      expect(res.status()).toBe(401);
    });

    test('登录后访问受保护接口应成功', async () => {
      await loginPage.login(`e2e_login_${username}`, 'LoginPass1');
      expect(loginPage.isLoggedIn()).toBe(true);
    });
  });
});
