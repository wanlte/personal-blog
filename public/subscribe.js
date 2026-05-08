// ===== 页面初始化 =====
checkAuth();
loadPlans();
loadSubscriptionStatus();

// ===== 检查登录 =====
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userInfo = document.getElementById('userInfo');
    const memberEntry = document.getElementById('memberEntry');

    if (token && user) {
        userInfo.innerHTML = `
            <div class="nav-user-menu">
                <span class="nav-user-name">${escapeHtml(user.username)}</span>
                <button id="logoutBtn" class="btn btn-ghost" style="padding:6px 12px;font-size:13px;">退出</button>
            </div>
        `;
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        });
        // 加载会员入口状态
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
    } else {
        userInfo.innerHTML = `<a href="/login.html" class="btn btn-ghost" style="padding:6px 12px;font-size:13px;">登录</a>`;
        if (memberEntry) {
            memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn">💎 会员</a>`;
        }
    }
}

// ===== 加载订阅方案 =====
async function loadPlans() {
    const container = document.getElementById('plansContainer');

    try {
        const response = await fetch('/api/subscription/plans');
        const plans = await response.json();

        if (plans.length === 0) {
            container.innerHTML = '<div class="empty">暂无可用方案</div>';
            return;
        }

        // 找出推荐方案（中间的那个或价格适中的）
        const featuredIndex = Math.floor(plans.length / 2);

        container.innerHTML = `
            <div class="plans-grid">
                ${plans.map((plan, index) => `
                    <div class="plan-card ${index === featuredIndex ? 'featured' : ''}">
                        <div class="plan-name">${escapeHtml(plan.name)}</div>
                        <div class="plan-price">¥${plan.price} <small>/${plan.durationDays}天</small></div>
                        <div class="plan-duration">约 ${Math.round(plan.durationDays / 30)} 个月</div>
                        <ul class="plan-features">
                            ${(plan.features || []).map(f => `
                                <li>${escapeHtml(f)}</li>
                            `).join('')}
                        </ul>
                        <button class="btn btn-primary subscribe-plan-btn" data-plan-id="${plan.id}">立即订阅</button>
                    </div>
                `).join('')}
            </div>
        `;

        // 绑定订阅按钮
        document.querySelectorAll('.subscribe-plan-btn').forEach(btn => {
            btn.addEventListener('click', () => subscribeToPlan(btn.dataset.planId));
        });
    } catch (error) {
        console.error('加载方案失败:', error);
        container.innerHTML = '<div class="error">加载失败，请稍后重试</div>';
    }
}

// ===== 加载订阅状态 =====
async function loadSubscriptionStatus() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('currentSubscription');
    if (!token || !container) return;

    try {
        const response = await fetch('/api/subscription/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.hasSubscription) {
            container.style.display = 'block';
            const sub = data.subscription;
            container.innerHTML = `
                <div class="current-subscription">
                    <h2>当前订阅</h2>
                    <div class="plan-name">${escapeHtml(sub.planName)}</div>
                    <div class="plan-expiry">到期时间：${formatDate(sub.endDate)}</div>
                    <button id="cancelSubscriptionBtn" class="cancel-sub-btn">取消订阅</button>
                </div>
            `;

            document.getElementById('cancelSubscriptionBtn')?.addEventListener('click', async () => {
                if (confirm('确定要取消订阅吗？取消后到期将不再享受会员权益。')) {
                    try {
                        const res = await fetch('/api/subscription/cancel', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const result = await res.json();
                        if (result.success) {
                            alert(result.message);
                            loadSubscriptionStatus();
                        }
                    } catch (e) {
                        alert('操作失败');
                    }
                }
            });
        }
    } catch (error) {
        console.error('加载订阅状态失败:', error);
    }
}

// ===== 订阅方案 =====
async function subscribeToPlan(planId) {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    if (!confirm('确定要订阅该方案吗？（模拟支付，不会产生实际扣费）')) return;

    try {
        const response = await fetch('/api/subscription/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ planId: parseInt(planId) })
        });

        const data = await response.json();

        if (data.success) {
            alert(`🎉 订阅成功！已开通 ${data.subscription.planName}，到期时间：${formatDate(data.subscription.endDate)}`);
            loadSubscriptionStatus();
            loadPlans();
            loadHistory();
        } else {
            alert(data.error || '订阅失败');
        }
    } catch (error) {
        console.error('订阅失败:', error);
        alert('订阅失败，请稍后重试');
    }
}

// ===== 加载订阅历史 =====
async function loadHistory() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('subscriptionHistory');
    const list = document.getElementById('historyList');
    if (!token) return;

    try {
        const response = await fetch('/api/subscription/history', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.subscriptions && data.subscriptions.length > 0) {
            container.style.display = 'block';
            list.innerHTML = data.subscriptions.map(sub => `
                <div class="dashboard-item" style="cursor:default;">
                    <div class="item-title" style="font-weight:600;">${escapeHtml(sub.plan?.name || '未知方案')}</div>
                    <div style="font-size:13px;color:var(--text-tertiary);">
                        状态：<span class="article-status ${sub.status}">${statusText(sub.status)}</span>
                    </div>
                    <div style="font-size:13px;color:var(--text-tertiary);">
                        ${formatDate(sub.startDate)} ~ ${formatDate(sub.endDate)}
                    </div>
                </div>
            `).join('') || '<div class="empty">暂无记录</div>';
        }
    } catch (error) {
        console.error('加载订阅历史失败:', error);
    }
}

// ===== 工具函数 =====
function formatDate(dateStr) {
    if (!dateStr) return '未知';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function statusText(status) {
    const map = { active: '生效中', expired: '已过期', cancelled: '已取消' };
    return map[status] || status;
}

// 加载历史
loadHistory();