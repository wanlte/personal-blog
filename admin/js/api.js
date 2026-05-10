// admin/js/api.js - API 调用封装
const API = {
  _base: '/api/admin',

  async _fetch(path, options = {}) {
    const token = localStorage.getItem('admin_token');
    const res = await fetch(`${this._base}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin/login.html';
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '请求失败' }));
      throw new Error(err.error || '请求失败');
    }
    return res.json();
  },

  // 仪表盘
  stats: {
    overview: () => API._fetch('/stats'),
    trends: () => API._fetch('/stats/trends'),
  },

  // 文章
  articles: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return API._fetch(`/articles${q ? '?' + q : ''}`);
    },
    update: (id, data) =>
      API._fetch(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) =>
      API._fetch(`/articles/${id}`, { method: 'DELETE' }),
  },

  // 用户
  users: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return API._fetch(`/users${q ? '?' + q : ''}`);
    },
    update: (id, data) =>
      API._fetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) =>
      API._fetch(`/users/${id}`, { method: 'DELETE' }),
    create: (data) =>
      API._fetch('/users', { method: 'POST', body: JSON.stringify(data) }),
  },

  // 评论
  comments: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return API._fetch(`/comments${q ? '?' + q : ''}`);
    },
    delete: (id) =>
      API._fetch(`/comments/${id}`, { method: 'DELETE' }),
  },

  // 设置
  settings: {
    get: () => API._fetch('/settings'),
    update: (data) =>
      API._fetch('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  },

  // 日志
  logs: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return API._fetch(`/logs${q ? '?' + q : ''}`);
    },
  },
};
