// pages/ArticlePage.js - 文章页面对象（API 封装）
class ArticlePage {
  constructor(request, authHeaders = {}) {
    this.request = request;
    this.authHeaders = authHeaders;
  }

  /**
   * 获取文章列表
   * @param {object} opts
   * @param {string} [opts.tag] 标签筛选
   */
  async getList({ tag } = {}) {
    const params = tag ? { tag } : {};
    const res = await this.request.get('/api/articles', { params });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 获取文章详情
   * @param {number} id 文章 ID
   */
  async getDetail(id) {
    const res = await this.request.get(`/api/articles/${id}`);
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 创建文章（需登录）
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} opts.content
   * @param {string} [opts.summary]
   */
  async create({ title, content, summary = '' }) {
    const res = await this.request.post('/api/articles', {
      headers: this.authHeaders,
      data: { title, content, summary },
    });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 更新文章（需登录且是作者）
   * @param {number} id
   * @param {object} data
   */
  async update(id, { title, content, summary = '' }) {
    const res = await this.request.put(`/api/articles/${id}`, {
      headers: this.authHeaders,
      data: { title, content, summary },
    });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 删除文章（需登录且是作者）
   * @param {number} id
   */
  async delete(id) {
    const res = await this.request.delete(`/api/articles/${id}`, {
      headers: this.authHeaders,
    });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 保存草稿（需登录）
   */
  async saveDraft({ title, content, summary = '', tags } = {}) {
    const res = await this.request.post('/api/articles/draft', {
      headers: this.authHeaders,
      data: { title, content, summary, tags },
    });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 获取草稿列表（需登录）
   */
  async getDrafts() {
    const res = await this.request.get('/api/articles/drafts/list', {
      headers: this.authHeaders,
    });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 发布草稿（需登录且是作者）
   * @param {number} id
   */
  async publishDraft(id) {
    const res = await this.request.put(`/api/articles/${id}/publish`, {
      headers: this.authHeaders,
    });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 置顶/取消置顶文章（需登录且是作者）
   * @param {number} id
   */
  async togglePin(id) {
    const res = await this.request.put(`/api/articles/${id}/pin`, {
      headers: this.authHeaders,
    });
    const json = await res.json();
    return { status: res.status(), body: json };
  }
}

module.exports = ArticlePage;
