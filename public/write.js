const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const messageDiv = document.getElementById('message');

// 发布文章
async function publishArticle() {
    const title = document.getElementById('title').value.trim();
    const summary = document.getElementById('summary').value.trim();
    const content = document.getElementById('content').value.trim();
    const tagsInput = document.getElementById('tags').value.trim();
    
    if (!title) {
        showMessage('请填写文章标题', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = '发布中...';
    
    try {
        // 1. 创建文章
        const response = await fetch('/api/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ title, summary, content })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '发布失败');
        }
        
        const article = await response.json();
        
        // 2. 添加标签
        if (tagsInput) {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
            for (const tagName of tags) {
                await fetch(`/api/articles/${article.id}/tags`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ tagName })
                });
            }
        }
        
        showMessage('✅ 文章发布成功！正在跳转...', 'success');
        
        setTimeout(() => {
            window.location.href = `/article.html?id=${article.id}`;
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