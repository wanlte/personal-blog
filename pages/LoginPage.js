// pages/LoginPage.js - 认证页面对象（API 封装）
class LoginPage {
  constructor(request) {
    this.request = request;
    this.token = null;
    this.user = null;
  }

  /**
   * 用户注册
   * @param {object} opts
   * @param {string} opts.username
   * @param {string} opts.password
   * @param {number} [opts.planId]
   */
  async register({ username, password, planId } = {}) {
    const body = { username, password };
    if (planId) body.planId = planId;

    const res = await this.request.post('/api/register', { data: body });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 用户登录
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    const res = await this.request.post('/api/login', {
      data: { username, password },
    });
    const json = await res.json();

    if (res.status() === 200 && json.token) {
      this.token = json.token;
      this.user = json.user;
    }

    return { status: res.status(), body: json };
  }

  /**
   * 获取带认证头的请求上下文
   */
  getAuthHeaders() {
    if (!this.token) return {};
    return { Authorization: `Bearer ${this.token}` };
  }

  /**
   * 创建新的认证请求上下文
   */
  async createAuthContext(browser) {
    if (!this.token) throw new Error('请先登录');
    return browser.newContext({
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    });
  }

  /**
   * 检查 token 是否有效
   */
  isLoggedIn() {
    return !!this.token;
  }

  /**
   * 登出（清理 token）
   */
  logout() {
    this.token = null;
    this.user = null;
  }
}

module.exports = LoginPage;
