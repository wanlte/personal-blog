// admin/js/auth.js - 管理员权限验证
const Auth = {
  _token: localStorage.getItem('admin_token'),
  _user: null,

  // 初始化：检查登录状态
  async init() {
    this._token = localStorage.getItem('admin_token');
    if (!this._token) return false;
    try {
      const res = await fetch('/api/admin/me', {
        headers: { Authorization: `Bearer ${this._token}` },
      });
      if (!res.ok) { this.logout(); return false; }
      this._user = await res.json();
      return true;
    } catch {
      return false;
    }
  },

  // 管理员登录
  async login(username, password) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '登录失败');
    }
    const data = await res.json();
    localStorage.setItem('admin_token', data.token);
    this._token = data.token;
    this._user = data.user;
    return data.user;
  },

  // 登出
  logout() {
    localStorage.removeItem('admin_token');
    this._token = null;
    this._user = null;
    window.location.href = '/admin/login.html';
  },

  // 获取当前用户
  getUser() { return this._user; },

  // 获取角色
  getRole() { return this._user?.role || ''; },

  // 权限检查
  isSuperAdmin() { return this._user?.role === 'super_admin'; },
  isContentAdmin() { return this._user?.role === 'super_admin' || this._user?.role === 'content_admin'; },
  isAnalyst() { return this._user?.role === 'analyst'; },

  // 获取认证头
  getHeaders() {
    return {
      Authorization: `Bearer ${this._token}`,
      'Content-Type': 'application/json',
    };
  },

  // 检查并重定向（如未登录跳转至登录页）
  async guard(allowedRoles) {
    const ok = await this.init();
    if (!ok) {
      window.location.href = '/admin/login.html';
      return false;
    }
    if (allowedRoles && allowedRoles.length > 0) {
      const hasRole = allowedRoles.some(r => {
        if (r === 'super_admin') return this.isSuperAdmin();
        if (r === 'content_admin') return this.isContentAdmin();
        if (r === 'analyst') return true;
        return false;
      });
      if (!hasRole) {
        document.body.innerHTML = '<div style="text-align:center;padding:80px 20px"><h1>403</h1><p>权限不足</p><a href="/admin/">返回首页</a></div>';
        return false;
      }
    }
    return true;
  },
};
