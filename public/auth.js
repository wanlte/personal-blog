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

// 注册
document.getElementById('registerBtn').addEventListener('click', async () => {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const messageDiv = document.getElementById('registerMessage');
    
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
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            messageDiv.textContent = '注册成功！请登录';
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