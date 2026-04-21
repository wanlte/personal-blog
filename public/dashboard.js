// 检查登录状态和权限
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userInfo = document.getElementById('userInfo');
    
    if (token && user) {
        userInfo.innerHTML = `<span>👤 ${user.username}</span>`;
    } else {
        // 未登录跳转到登录页
        window.location.href = '/login.html';
    }
}

// 加载统计数据
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        // 更新卡片数据
        document.getElementById('totalArticles').textContent = stats.totalArticles || 0;
        document.getElementById('totalViews').textContent = stats.totalViews || 0;
        document.getElementById('totalComments').textContent = stats.totalComments || 0;
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('todayArticles').textContent = stats.todayArticles || 0;
        document.getElementById('draftCount').textContent = stats.draftCount || 0;

        // 渲染热门文章
        const popularList = document.getElementById('popularList');
        if (stats.popularArticles && stats.popularArticles.length > 0) {
            popularList.innerHTML = stats.popularArticles.map((article, index) => `
                <div class="dashboard-item" onclick="viewArticle(${article.id})">
                    <div class="item-rank ${index < 3 ? `rank-${index + 1}` : ''}">${index + 1}</div>
                    <div class="item-title">${escapeHtml(article.title)}</div>
                    <div class="item-views">👁️ ${article.views}</div>
                </div>
            `).join('');
        } else {
            popularList.innerHTML = '<div class="empty">暂无文章</div>';
        }
        
        // 渲染趋势图
        renderTrendChart(stats.trend);
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
        document.getElementById('popularList').innerHTML = '<div class="error">加载失败</div>';
    }
}

// 渲染趋势图（简易柱状图）
function renderTrendChart(trend) {
    const chartContainer = document.getElementById('trendChart');
    
    if (!trend || trend.length === 0) {
        chartContainer.innerHTML = '<div class="empty">暂无数据</div>';
        return;
    }
    
    // 补全最近7天的数据
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const fullDateStr = date.toISOString().split('T')[0];
        const existing = trend.find(t => t.date === fullDateStr);
        last7Days.push({
            date: dateStr,
            count: existing ? existing.count : 0
        });
    }
    
    const maxCount = Math.max(...last7Days.map(d => d.count), 1);
    
    chartContainer.innerHTML = `
        <div class="bar-chart">
            ${last7Days.map(day => `
                <div class="bar-item">
                    <div class="bar" style="height: ${(day.count / maxCount) * 100}%"></div>
                    <div class="bar-label">${day.date}</div>
                    <div class="bar-value">${day.count}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// 查看文章详情
function viewArticle(id) {
    window.location.href = `/article.html?id=${id}`;
}

// 编辑草稿
function editArticle(id) {
    window.location.href = `/write.html?id=${id}`;
}

// 转义HTML特殊字符
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '未知时间';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 加载草稿列表
async function loadDrafts() {
    const draftList = document.getElementById('draftList');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            draftList.innerHTML = '<div class="error">请先登录</div>';
            return;
        }
        
        const response = await fetch('/api/articles/drafts', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            draftList.innerHTML = `<div class="error">${error.error || '加载失败'}</div>`;
            return;
        }
        
        const drafts = await response.json();
        
        if (drafts.length === 0) {
            draftList.innerHTML = '<div class="empty">暂无草稿</div>';
            return;
        }
        
        draftList.innerHTML = drafts.map(draft => `
            <div class="dashboard-item">
                <div class="item-title">${escapeHtml(draft.title || '无标题')}</div>
                <div class="item-date">📅 ${formatDate(draft.updated_at)}</div>
                <div class="item-actions">
                    <button onclick="editArticle(${draft.id})" class="btn-small">编辑</button>
                    <button onclick="publishDraft(${draft.id})" class="btn-small btn-publish">发布</button>
                    <button onclick="deleteDraft(${draft.id})" class="btn-small btn-delete">删除</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载草稿失败:', error);
        draftList.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
    }
}

// 发布草稿
async function publishDraft(id) {
    if (!confirm('确定要发布这篇草稿吗？')) return;
    
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/articles/${id}/publish`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
        loadDrafts();
        loadStats();
    } else {
        alert('发布失败');
    }
}

// 删除草稿
async function deleteDraft(id) {
    if (!confirm('确定要删除这篇草稿吗？')) return;
    
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
        loadDrafts();
        loadStats();
    } else {
        alert('删除失败');
    }
}

// 页面加载
checkAuth();
loadStats();
loadDrafts();