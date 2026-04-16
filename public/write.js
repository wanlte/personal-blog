const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const messageDiv = document.getElementById('message');

// 发布文章
async function publishArticle() {
    const title = document.getElementById('title').value.trim();
    const summary = document.getElementById('summary').value.trim();
    const content = document.getElementById('content').value.trim();
    const token = localStorage.getItem('token');


    // 验证标题
    if (!title) {
        showMessage('请填写文章标题', 'error');
        return;
    }
    
    // 显示加载状态
    submitBtn.disabled = true;
    submitBtn.textContent = '发布中...';
    
    try {
        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title,
                summary: summary,
                content: content
            })
        });

        if (response.status === 401) {
            alert('请先登录');
            window.location.href = '/login.html';
            return;
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '发布失败');
        }
        
        const result = await response.json();
        showMessage('✅ 文章发布成功！正在跳转...', 'success');
        
        // 2秒后跳转到文章详情页
        setTimeout(() => {
            window.location.href = `/article.html?id=${result.id}`;
        }, 1500);
        
    } catch (error) {
        console.error('发布失败:', error);
        showMessage('❌ ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '发布文章';
    }
}

// 显示消息
function showMessage(msg, type) {
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 3000);
    }
}

// 取消按钮
cancelBtn.addEventListener('click', () => {
    window.location.href = '/';
});

// 提交按钮
submitBtn.addEventListener('click', publishArticle);

// 按 Ctrl+Enter 快速发布
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        publishArticle();
    }
});