// 从 URL 获取参数
const urlParams = new URLSearchParams(window.location.search);
const articleId = urlParams.get('id');

// 填充表单
document.getElementById('articleId').value = articleId;
document.getElementById('title').value = decodeURIComponent(urlParams.get('title') || '');
document.getElementById('summary').value = decodeURIComponent(urlParams.get('summary') || '');
document.getElementById('content').value = decodeURIComponent(urlParams.get('content') || '');

// 更新文章
document.getElementById('updateBtn').addEventListener('click', async () => {
    const title = document.getElementById('title').value.trim();
    const summary = document.getElementById('summary').value.trim();
    const content = document.getElementById('content').value.trim();
    
    if (!title) {
        alert('请填写标题');
        return;
    }
    
    const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary, content })
    });
    
    if (response.ok) {
        window.location.href = `/article.html?id=${articleId}`;
    } else {
        alert('更新失败');
    }
});

// 取消按钮
document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.href = `/article.html?id=${articleId}`;
});