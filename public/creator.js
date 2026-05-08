// ============ 状态 ============
let creatorData = null;
let currentTab = 'overview';

// ============ 初始化 ============
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadCreatorData();

    // Tab切换
    document.querySelectorAll('.creator-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.creator-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.creator-tab-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            document.getElementById(`tab${capitalize(tab.dataset.tab)}`).style.display = 'block';

            if (currentTab === 'articles') loadArticles();
            if (currentTab === 'earnings') loadEarnings();
        });
    });

    // 保存创作者设置
    document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
});

// ============ 认证检查 ============
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userInfo = document.getElementById('userInfo');
    const memberEntry = document.getElementById('memberEntry');

    if (!token || !user) {
        window.location.href = '/login.html';
        return;
    }

    userInfo.innerHTML = `
        <div class="nav-user-menu">
            <span class="nav-user-name">${escapeHtml(user.username)}</span>
            <button id="logoutBtn" class="btn btn-ghost" style="padding:6px 12px;font-size:13px;">退出</button>
        </div>
    `;
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });

    // 加载会员入口
    fetch('/api/subscription/status', {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
        if (data.hasSubscription && memberEntry) {
            memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn premium">💎 ${data.subscription.planName}</a>`;
        } else if (memberEntry) {
            memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn">💎 开通会员</a>`;
        }
    }).catch(() => {
        if (memberEntry) memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn">💎 会员</a>`;
    });
}

// ============ 加载创作者数据 ============
async function loadCreatorData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/creator/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        creatorData = data;

        renderHeader(data);
        renderStats(data);
        renderTrend(data.trend);
    } catch (error) {
        console.error('加载创作者数据失败:', error);
        document.getElementById('creatorHeader').innerHTML = '<div class="error">加载失败</div>';
    }
}

// ============ 渲染头部 ============
function renderHeader(data) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const container = document.getElementById('creatorHeader');
    const profile = data.profile || {};

    container.innerHTML = `
        <div class="creator-avatar-lg">${user.username ? user.username.charAt(0).toUpperCase() : 'U'}</div>
        <div class="creator-header-info">
            <h1>
                ${escapeHtml(user.username || '创作者')}
                ${profile.isVerified ? '<span class="creator-badge verified" style="font-size:18px;"></span>' : ''}
                <span class="creator-badge"><span class="crown">👑</span> 创作者</span>
            </h1>
            <p>${profile.bio ? escapeHtml(profile.bio) : '还没有填写个人简介'}</p>
        </div>
        <div class="creator-header-actions">
            <a href="/write.html" class="btn btn-primary">✍️ 写文章</a>
            <a href="/" class="btn btn-ghost">← 返回首页</a>
        </div>
    `;
}

// ============ 渲染统计卡片 ============
function renderStats(data) {
    const grid = document.getElementById('statsGrid');
    grid.innerHTML = `
        <div class="creator-stat-card">
            <div class="stat-icon">📝</div>
            <div class="creator-stat-value">${data.totalArticles}</div>
            <div class="creator-stat-label">总文章</div>
        </div>
        <div class="creator-stat-card">
            <div class="stat-icon">👁️</div>
            <div class="creator-stat-value">${data.totalViews}</div>
            <div class="creator-stat-label">总阅读</div>
        </div>
        <div class="creator-stat-card">
            <div class="stat-icon">❤️</div>
            <div class="creator-stat-value">${data.totalLikes}</div>
            <div class="creator-stat-label">获赞</div>
        </div>
        <div class="creator-stat-card">
            <div class="stat-icon">👥</div>
            <div class="creator-stat-value">${data.followerCount}</div>
            <div class="creator-stat-label">关注者</div>
        </div>
        <div class="creator-stat-card">
            <div class="stat-icon">💬</div>
            <div class="creator-stat-value">${data.totalComments}</div>
            <div class="creator-stat-label">评论</div>
        </div>
        <div class="creator-stat-card">
            <div class="stat-icon">💰</div>
            <div class="creator-stat-value" style="color:#f59e0b;">¥${data.monthEarnings}</div>
            <div class="creator-stat-label">本月收入</div>
        </div>
    `;
}

// ============ 渲染趋势图 ============
function renderTrend(trend) {
    const container = document.getElementById('creatorTrendChart');
    if (!trend || trend.length === 0) {
        container.innerHTML = '<div class="empty">暂无数据</div>';
        return;
    }

    const maxCount = Math.max(...trend.map(d => d.count), 1);
    container.innerHTML = `
        <div class="bar-chart">
            ${trend.map(day => `
                <div class="bar-item">
                    <div class="bar" style="height: ${(day.count / maxCount) * 100}%"></div>
                    <div class="bar-label">${formatDayLabel(day.date)}</div>
                    <div class="bar-value">${day.count}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// ============ 加载文章列表 ============
async function loadArticles() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('articlesTableContainer');

    try {
        const response = await fetch('/api/creator/articles?limit=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.articles.length === 0) {
            container.innerHTML = '<div class="empty">暂无文章，开始写第一篇文章吧！</div>';
            return;
        }

        container.innerHTML = `
            <table class="creator-table">
                <thead>
                    <tr>
                        <th>标题</th>
                        <th>状态</th>
                        <th>阅读</th>
                        <th>互动</th>
                        <th>付费</th>
                        <th>日期</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.articles.map(a => `
                        <tr>
                            <td><a href="/article.html?id=${a.id}" style="color:var(--text-primary);text-decoration:none;font-weight:500;">${escapeHtml(a.title || '无标题')}</a></td>
                            <td><span class="article-status ${a.status}">${a.status === 'published' ? '已发布' : '草稿'}</span></td>
                            <td>👁️ ${a.views}</td>
                            <td>❤️ ${a.likeCount} 💬 ${a.commentCount}</td>
                            <td>${a.isPaid ? `<span class="paid-badge" style="font-size:11px;">🔒 ¥${a.price}</span>` : '<span style="color:var(--text-tertiary);font-size:13px;">免费</span>'}</td>
                            <td style="font-size:13px;color:var(--text-tertiary);">${formatDate(a.createdAt)}</td>
                            <td>
                                <a href="/edit.html?id=${a.id}" class="btn btn-ghost" style="padding:4px 10px;font-size:12px;">编辑</a>
                                <button class="toggle-paid-btn btn btn-ghost" data-id="${a.id}" data-paid="${a.isPaid}" data-price="${a.price}" style="padding:4px 10px;font-size:12px;">${a.isPaid ? '取消付费' : '设为付费'}</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${data.pagination.totalPages > 1 ? `<div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text-tertiary);">共 ${data.pagination.total} 篇</div>` : ''}
        `;

        // 绑定付费切换
        document.querySelectorAll('.toggle-paid-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const token = localStorage.getItem('token');
                const isPaid = btn.dataset.paid === '1' ? 0 : 1;
                let price = btn.dataset.price;

                if (isPaid && !price) {
                    price = prompt('设置付费价格（元）：', '9.99');
                    if (!price || isNaN(price)) return;
                }

                try {
                    const res = await fetch(`/api/creator/articles/${btn.dataset.id}/paid`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ isPaid, price: parseFloat(price) })
                    });
                    if (res.ok) {
                        loadArticles();
                    } else {
                        alert('操作失败');
                    }
                } catch (e) {
                    alert('操作失败');
                }
            });
        });
    } catch (error) {
        console.error('加载文章失败:', error);
        container.innerHTML = '<div class="error">加载失败</div>';
    }
}

// ============ 加载收入明细 ============
async function loadEarnings() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('earningsContainer');

    try {
        const response = await fetch('/api/creator/earnings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.purchases.length === 0) {
            container.innerHTML = `
                <div class="earnings-summary">
                    <div class="earnings-card">
                        <div class="amount">¥0.00</div>
                        <div class="label">累计收入</div>
                    </div>
                </div>
                <div class="empty">暂无收入，设置付费文章开始赚钱吧！</div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="earnings-summary">
                <div class="earnings-card">
                    <div class="amount">¥${data.totalEarnings}</div>
                    <div class="label">累计收入</div>
                </div>
                <div class="earnings-card">
                    <div class="amount" style="color: var(--text-primary);">${data.purchases.length}</div>
                    <div class="label">购买次数</div>
                </div>
            </div>
            <table class="creator-table">
                <thead>
                    <tr>
                        <th>文章</th>
                        <th>购买者</th>
                        <th>金额</th>
                        <th>时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.purchases.map(p => `
                        <tr>
                            <td><a href="/article.html?id=${p.articleTitle ? '' : ''}" style="color:var(--text-primary);text-decoration:none;">${escapeHtml(p.articleTitle)}</a></td>
                            <td>${escapeHtml(p.buyerName)}</td>
                            <td style="color:#f59e0b;font-weight:600;">¥${p.amount}</td>
                            <td style="font-size:13px;color:var(--text-tertiary);">${formatDate(p.createdAt)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('加载收入失败:', error);
        container.innerHTML = '<div class="error">加载失败</div>';
    }
}

// ============ 保存创作者设置 ============
async function saveProfile() {
    const token = localStorage.getItem('token');
    const bio = document.getElementById('creatorBio').value.trim();
    const messageDiv = document.getElementById('profileMessage');

    try {
        const response = await fetch('/api/creator/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bio })
        });

        if (response.ok) {
            messageDiv.textContent = '✅ 设置已保存';
            messageDiv.className = 'message success';
            loadCreatorData();
        } else {
            messageDiv.textContent = '❌ 保存失败';
            messageDiv.className = 'message error';
        }
    } catch (error) {
        messageDiv.textContent = '❌ 保存失败';
        messageDiv.className = 'message error';
    }
}

// ============ 工具函数 ============
function formatDate(dateStr) {
    if (!dateStr) return '未知';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 刷新授权后加载数据
setTimeout(() => {
    // 已在checkAuth时处理
}, 0);