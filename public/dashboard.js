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

function viewArticle(id) {
    window.location.href = `/article.html?id=${id}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载
checkAuth();
loadStats();