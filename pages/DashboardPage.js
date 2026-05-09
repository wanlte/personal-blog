// pages/DashboardPage.js - 仪表盘页面对象（API 封装）
class DashboardPage {
  constructor(request, authHeaders = {}) {
    this.request = request;
    this.authHeaders = authHeaders;
  }

  /**
   * 搜索文章
   * @param {string} q 关键词
   * @param {object} opts
   */
  async search(q, { page = 1, limit = 10 } = {}) {
    const res = await this.request.get('/api/search', {
      params: { q, page, limit },
    });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 获取热门文章
   */
  async getPopular(limit = 10) {
    const res = await this.request.get('/api/popular', { params: { limit } });
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 获取归档列表
   */
  async getArchive() {
    const res = await this.request.get('/api/archive');
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 按月获取归档
   * @param {string} yearMonth 格式 YYYY-MM
   */
  async getArchiveByMonth(yearMonth) {
    const res = await this.request.get(`/api/archive/${yearMonth}`);
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 获取站点统计
   */
  async getStats() {
    const res = await this.request.get('/api/stats');
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * 数据库健康检查
   */
  async healthCheck() {
    const res = await this.request.get('/api/health/db');
    const json = await res.json();
    return { status: res.status(), body: json };
  }

  /**
   * RSS Feed
   */
  async getRSS() {
    const res = await this.request.get('/rss.xml');
    return { status: res.status(), body: await res.text() };
  }

  /**
   * 站点地图
   */
  async getSitemap() {
    const res = await this.request.get('/sitemap.xml');
    return { status: res.status(), body: await res.text() };
  }

  /**
   * 获取受欢迎的创作者
   */
  async getPopularAuthors() {
    const res = await this.request.get('/api/authors');
    const json = await res.json();
    return { status: res.status(), body: json };
  }
}

module.exports = DashboardPage;
