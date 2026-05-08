// 切换标签页
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById(`${tab}Form`).classList.add('active');
    });
});

// 加载订阅方案展示（登录页）
async function loadPlansShowcase() {
    const showcase = document.getElementById('plansShowcase');
    const planOptions = document.getElementById('registerPlanOptions');
    if (!showcase && !planOptions) return;

    try {
        const response = await fetch('/api/subscription/plans');
        const plans = await response.json();

        if (showcase && plans.length > 0) {
            const featured = plans.find(p => p.isActive) || plans[0];
            showcase.innerHTML = plans.slice(0, 2).map(plan => `
                <div class="plan-mini-card ${plan.id === featured.id ? 'featured-mini' : ''}">
                    <div class="plan-mini-name">${escapeHtml(plan.name)}</div>
                    <div class="plan-mini-price">¥${plan.price} <small>/${plan.durationDays}天</small></div>
                </div>
            `).join('');
        }

        if (planOptions && plans.length > 0) {
            planOptions.innerHTML = `
                <label class="plan-radio">
                    <input type="radio" name="regPlan" value="" checked>
                    <div class="plan-radio-info">
                        <div class="plan-radio-name">暂不选择</div>
                        <div class="plan-radio-price">免费注册，后续可升级</div>
                    </div>
                </label>
                ${plans.map(plan => `
                    <label class="plan-radio">
                        <input type="radio" name="regPlan" value="${plan.id}">
                        <div class="plan-radio-info">
                            <div class="plan-radio-name">${escapeHtml(plan.name)}</div>
                            <div class="plan-radio-price">¥${plan.price} / ${plan.durationDays}天</div>
                        </div>
                    </label>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('加载订阅方案失败:', error);
        if (showcase) showcase.innerHTML = '';
        if (planOptions) planOptions.innerHTML = '';
    }
}

// 登录
document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const messageDiv = document.getElementById('loginMessage');

    if (!username || !password) {
        messageDiv.textContent = '请填写用户名和密码';
        messageDiv.className = 'message error';
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            messageDiv.textContent = '登录成功！正在跳转...';
            messageDiv.className = 'message success';
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } else {
            messageDiv.textContent = data.error || '登录失败';
            messageDiv.className = 'message error';
        }
    } catch (error) {
        messageDiv.textContent = '网络错误，请稍后重试';
        messageDiv.className = 'message error';
    }
});

// 注册（支持选择会员方案）
document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const messageDiv = document.getElementById('registerMessage');

    // 获取选中的订阅方案
    const selectedPlan = document.querySelector('input[name="regPlan"]:checked');
    const planId = selectedPlan ? selectedPlan.value : null;

    if (!username || !password) {
        messageDiv.textContent = '请填写用户名和密码';
        messageDiv.className = 'message error';
        return;
    }

    if (password.length < 6) {
        messageDiv.textContent = '密码长度不能少于6位';
        messageDiv.className = 'message error';
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, planId: planId || undefined })
        });

        const data = await response.json();

        if (response.ok) {
            let successMsg = '注册成功！请登录';
            if (data.subscription) {
                successMsg += `，已自动开通 ${data.subscription.planName} 会员`;
            }
            messageDiv.textContent = successMsg;
            messageDiv.className = 'message success';
            document.getElementById('regUsername').value = '';
            document.getElementById('regPassword').value = '';
            setTimeout(() => {
                document.querySelector('.tab-btn[data-tab="login"]').click();
            }, 1500);
        } else {
            messageDiv.textContent = data.error || '注册失败';
            messageDiv.className = 'message error';
        }
    } catch (error) {
        messageDiv.textContent = '网络错误，请稍后重试';
        messageDiv.className = 'message error';
    }
});

// 加载订阅方案
loadPlansShowcase();

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
