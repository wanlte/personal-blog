let easyMDE = null;

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 获取 URL 参数
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    const title = decodeURIComponent(urlParams.get('title') || '');
    const summary = decodeURIComponent(urlParams.get('summary') || '');
    const content = decodeURIComponent(urlParams.get('content') || '');
    
    // 填充普通表单字段
    const articleIdInput = document.getElementById('articleId');
    const titleInput = document.getElementById('title');
    const summaryTextarea = document.getElementById('summary');
    
    if (articleIdInput) articleIdInput.value = articleId;
    if (titleInput) titleInput.value = title;
    if (summaryTextarea) summaryTextarea.value = summary;
    
    // 初始化 EasyMDE
    const contentElement = document.getElementById('content');
    if (contentElement) {
        easyMDE = new EasyMDE({
            element: contentElement,
            spellChecker: false,
            placeholder: '使用 Markdown 格式书写...',
            toolbar: [
                'bold', 'italic', 'heading', '|',
                'quote', 'code', 'unordered-list', 'ordered-list', '|',
                {
                    name: 'image',
                    action: function(editor) {
                        // editor 是 EasyMDE 实例
                        const cm = editor.codemirror;  // 获取 CodeMirror 实例
                        const cursor = cm.getCursor();
                        
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = async function() {
                            const file = input.files[0];
                            if (!file) return;
                            
                            // 插入上传中占位符
                            const loadingText = '![上传中...]()';
                            cm.replaceRange(loadingText, cursor);
                            
                            const formData = new FormData();
                            formData.append('image', file);
                            
                            try {
                                const token = localStorage.getItem('token');
                                const response = await fetch('/api/upload', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: formData
                                });
                                const data = await response.json();
                                
                                if (response.ok) {
                                    const markdown = `![${file.name}](${data.url})`;
                                    const currentContent = cm.getValue();
                                    const newContent = currentContent.replace(loadingText, markdown);
                                    cm.setValue(newContent);
                                } else {
                                    alert(data.error || '上传失败');
                                    const currentContent = cm.getValue();
                                    const newContent = currentContent.replace(loadingText, '');
                                    cm.setValue(newContent);
                                }
                            } catch (error) {
                                console.error('上传错误:', error);
                                alert('上传失败');
                                const currentContent = cm.getValue();
                                const newContent = currentContent.replace(loadingText, '');
                                cm.setValue(newContent);
                            }
                        };
                        input.click();
                    },
                    className: 'fa fa-image',
                    title: '上传图片'
                },
                '|',
                'preview', 'side-by-side', 'fullscreen', '|',
                'guide'
            ]
        });
        
        // 设置编辑器内容
        easyMDE.value(content);
    }
    
    // 绑定更新按钮事件
    const updateBtn = document.getElementById('updateBtn');
    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            const title = document.getElementById('title').value.trim();
            const summary = document.getElementById('summary').value.trim();
            const content = easyMDE ? easyMDE.value() : document.getElementById('content').value.trim();
            
            if (!title) {
                alert('请填写标题');
                return;
            }
            
            const token = localStorage.getItem('token');
            
            if (!token) {
                alert('请先登录');
                window.location.href = '/login.html';
                return;
            }
            
            try {
                const response = await fetch(`/api/articles/${articleId}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, summary, content })
                });
                
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    alert('登录已过期，请重新登录');
                    window.location.href = '/login.html';
                    return;
                }
                
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
    }
    
    // 绑定取消按钮事件
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.location.href = `/article.html?id=${articleId}`;
        });
    }
});