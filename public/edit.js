// 初始化 Markdown 编辑器
let easyMDE = null;

document.addEventListener('DOMContentLoaded', () => {
    // 获取 URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    const title = decodeURIComponent(urlParams.get('title') || '');
    const summary = decodeURIComponent(urlParams.get('summary') || '');
    const content = decodeURIComponent(urlParams.get('content') || '');
    
    // 填充普通表单字段
    document.getElementById('articleId').value = articleId;
    document.getElementById('title').value = title;
    document.getElementById('summary').value = summary;
    
    // 初始化 EasyMDE
    if (document.getElementById('content')) {
        easyMDE = new EasyMDE({
            element: document.getElementById('content'),
            spellChecker: false,
            placeholder: '使用 Markdown 格式书写...'
        });
        
        // 设置编辑器内容
        easyMDE.value(content);
    } else {
        // 如果没有 EasyMDE，直接设置 textarea 的值
        document.getElementById('content').value = content;
    }
    
    // 绑定更新按钮事件
    document.getElementById('updateBtn').addEventListener('click', async () => {
        const title = document.getElementById('title').value.trim();
        const summary = document.getElementById('summary').value.trim();
        // 从 EasyMDE 获取内容（如果有）
        const content = easyMDE ? easyMDE.value() : document.getElementById('content').value.trim();
        
        if (!title) {
            alert('请填写标题');
            return;
        }
        
        try {
            const response = await fetch(`/api/articles/${articleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, summary, content })
            });
            
            if (response.ok) {
                window.location.href = `/article.html?id=${articleId}`;
            } else {
                const data = await response.json();
                alert(data.error || '更新失败');
            }
        } catch (error) {
            console.error('更新失败:', error);
            alert('更新失败，请稍后重试');
        }
    });
    
    // 绑定取消按钮事件
    document.getElementById('cancelBtn').addEventListener('click', () => {
        window.location.href = `/article.html?id=${articleId}`;
    });
});