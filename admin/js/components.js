// admin/js/components.js - 通用 UI 组件
const UI = {
  // 侧边栏导航
  renderSidebar(currentPage) {
    const role = Auth.getRole();
    const isSuper = Auth.isSuperAdmin();
    const isContent = Auth.isContentAdmin();

    const items = [
      { href: '/admin/', icon: '📊', label: '首页', roles: ['super_admin', 'content_admin', 'analyst'] },
      { href: '/admin/articles.html', icon: '📝', label: '文章管理', roles: ['super_admin', 'content_admin'] },
      { href: '/admin/comments.html', icon: '💬', label: '评论管理', roles: ['super_admin', 'content_admin'] },
      { href: '/admin/users.html', icon: '👥', label: '用户管理', roles: ['super_admin'] },
      { href: '/admin/stats.html', icon: '📈', label: '数据统计', roles: ['super_admin', 'content_admin', 'analyst'] },
      { href: '/admin/settings.html', icon: '⚙️', label: '系统设置', roles: ['super_admin'] },
    ];

    const filtered = items.filter(i => i.roles.includes(role) || (isContent && i.roles.includes('content_admin')));
    const links = filtered.map(i => {
      const active = currentPage === i.href.split('/').pop().replace('.html', '') || (currentPage === '' && i.href === '/admin/');
      return `<a href="${i.href}" class="nav-item${active ? ' active' : ''}"><span class="nav-icon">${i.icon}</span>${i.label}</a>`;
    }).join('');

    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand"><a href="/admin/">⚡ 管理后台</a></div>
        <nav class="sidebar-nav">${links}</nav>
        <div class="sidebar-footer">
          <div class="sidebar-user">👤 ${Auth.getUser()?.username || ''}<br><small>${role}</small></div>
          <button class="btn btn-sm btn-outline" onclick="Auth.logout()">退出</button>
        </div>
      </aside>
    `;
  },

  // 顶部栏
  renderHeader(title) {
    return `
      <header class="topbar">
        <button class="menu-toggle" onclick="UI.toggleSidebar()">☰</button>
        <h1>${title}</h1>
        <div class="topbar-actions"><a href="/" target="_blank">🏠 访问网站</a></div>
      </header>
    `;
  },

  // 分页组件
  renderPagination(pagination, onPageChange) {
    const { page, totalPages } = pagination;
    if (totalPages <= 1) return '';
    let html = '<div class="pagination">';
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="${onPageChange}(${page - 1})">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
      } else if (i === page - 3 || i === page + 3) {
        html += '<span>...</span>';
      }
    }
    html += `<button ${page >= totalPages ? 'disabled' : ''} onclick="${onPageChange}(${page + 1})">›</button>`;
    html += `<span class="page-info">共 ${pagination.total} 条</span>`;
    html += '</div>';
    return html;
  },

  // 数据表格
  renderTable(columns, data, actions) {
    if (!data.length) return '<div class="empty-state">暂无数据</div>';
    const header = columns.map(c => `<th>${c.label}</th>`).join('');
    const actionHeader = actions ? '<th>操作</th>' : '';
    const rows = data.map(row => {
      const cells = columns.map(c => `<td>${c.render ? c.render(row) : (row[c.key] ?? '')}</td>`).join('');
      const actionCell = actions ? `<td class="actions">${actions(row)}</td>` : '';
      return `<tr>${cells}${actionCell}</tr>`;
    }).join('');
    return `<table class="data-table"><thead><tr>${header}${actionHeader}</tr></thead><tbody>${rows}</tbody></table>`;
  },

  // 统计卡片
  renderStatCards(stats) {
    const cards = [
      { label: '文章总数', value: stats.articles || 0, sub: `${stats.published || 0} 已发布 / ${stats.drafts || 0} 草稿`, color: '#667eea' },
      { label: '用户总数', value: stats.users || 0, sub: `${stats.admins || 0} 管理员`, color: '#764ba2' },
      { label: '评论总数', value: stats.comments || 0, sub: `${stats.pendingComments || 0} 待审核`, color: '#f093fb' },
      { label: '总浏览量', value: stats.totalViews?.toLocaleString() || '0', sub: '累计', color: '#4facfe' },
    ];
    return cards.map(c => `
      <div class="stat-card" style="border-left: 3px solid ${c.color}">
        <div class="stat-label">${c.label}</div>
        <div class="stat-value">${c.value}</div>
        <div class="stat-sub">${c.sub}</div>
      </div>
    `).join('');
  },

  // Toast 提示
  toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },

  // 模态框
  modal(title, content, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">${title}<button class="modal-close">&times;</button></div>
        <div class="modal-body">${content}</div>
        <div class="modal-footer">
          <button class="btn btn-outline modal-cancel">取消</button>
          <button class="btn btn-primary modal-confirm">确认</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').onclick = () => overlay.remove();
    overlay.querySelector('.modal-cancel').onclick = () => overlay.remove();
    overlay.querySelector('.modal-confirm').onclick = async () => {
      await onConfirm();
      overlay.remove();
    };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  },

  // 侧边栏切换
  toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  },

  // 状态标签
  statusBadge(status) {
    const map = { published: ['已发布', 'success'], draft: ['草稿', 'warning'], pending: ['待审核', 'info'], archived: ['已归档', 'default'] };
    const [label, cls] = map[status] || [status, 'default'];
    return `<span class="badge badge-${cls}">${label}</span>`;
  },
};
