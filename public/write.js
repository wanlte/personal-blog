const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const messageDiv = document.getElementById('message');

let easyMDE = null;
let isEditing = false;
let currentArticleId = null;

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('content')) {
        easyMDE = new EasyMDE({
            element: document.getElementById('content'),
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
                                    // 替换为实际图片
                                    const markdown = `![${file.name}](${data.url})`;
                                    const content = cm.getValue();
                                    const newContent = content.replace(loadingText, markdown);
                                    cm.setValue(newContent);
                                } else {
                                    alert(data.error || '上传失败');
                                    const content = cm.getValue();
                                    const newContent = content.replace(loadingText, '');
                                    cm.setValue(newContent);
                                }
                            } catch (error) {
                                console.error('上传错误:', error);
                                alert('上传失败');
                                const content = cm.getValue();
                                const newContent = content.replace(loadingText, '');
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
    }
    
    // 检查是否是编辑模式
    loadArticleForEdit();
});

// 加载文章数据用于编辑
async function loadArticleForEdit() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (id) {
        currentArticleId = parseInt(id);
        isEditing = true;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/articles/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error('无法加载文章');
            }
            
            const article = await response.json();
            
            // 填充表单
            document.getElementById('title').value = article.title || '';
            document.getElementById('summary').value = article.summary || '';
            document.getElementById('tags').value = '';
            
            if (easyMDE) {
                easyMDE.value(article.content || '');
            } else {
                document.getElementById('content').value = article.content || '';
            }
            
            // 修改按钮文字
            submitBtn.textContent = '保存修改';
            saveDraftBtn.textContent = '保存草稿';
            
            // 加载标签
            loadArticleTags(id);
            
        } catch (error) {
            console.error('加载文章失败:', error);
            showMessage('❌ 无法加载文章', 'error');
        }
    }
}

// 加载文章标签
async function loadArticleTags(articleId) {
    try {
        const response = await fetch(`/api/articles/${articleId}/tags`);
        if (response.ok) {
            const tags = await response.json();
            document.getElementById('tags').value = tags.map(t => t.name).join(', ');
        }
    } catch (error) {
        console.error('加载标签失败:', error);
    }
}

// ============= 保存草稿 =============
async function saveDraft() {
    const title = document.getElementById('title').value.trim();
    const summary = document.getElementById('summary').value.trim();
    const content = easyMDE ? easyMDE.value() : document.getElementById('content').value.trim();
    const tagsInput = document.getElementById('tags').value.trim();
    
    if (!title && !content) {
        showMessage('请至少填写标题或内容', 'error');
        return;
    }
    
    saveDraftBtn.disabled = true;
    saveDraftBtn.textContent = '保存中...';
    
    try {
        const token = localStorage.getItem('token');
        
        if (isEditing && currentArticleId) {
            // 更新已有文章为草稿
            await fetch(`/api/articles/${currentArticleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, summary, content })
            });
            
            // 先发布再转为草稿
            await fetch(`/api/articles/${currentArticleId}/publish`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            showMessage('✅ 草稿已保存！', 'success');
        } else {
            // 创建新草稿
            const response = await fetch('/api/articles/draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, summary, content, tags: tagsInput })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '保存失败');
            }
            
            showMessage('✅ 草稿已保存！', 'success');
        }
        
        setTimeout(() => {
            window.location.href = '/dashboard.html?tab=drafts';
        }, 1500);
        
    } catch (error) {
        console.error('保存失败:', error);
        showMessage('❌ ' + error.message, 'error');
        saveDraftBtn.disabled = false;
        saveDraftBtn.textContent = '保存草稿';
    }
}

// 绑定保存草稿按钮
const saveDraftBtn = document.getElementById('saveDraftBtn');
if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', saveDraft);
}

// ============= 发布/更新文章 =============
async function publishArticle() {
    const title = document.getElementById('title').value.trim();
    const summary = document.getElementById('summary').value.trim();
    const content = easyMDE ? easyMDE.value() : document.getElementById('content').value.trim();
    const tagsInput = document.getElementById('tags').value.trim();
    
    if (!title) {
        showMessage('请填写文章标题', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? '保存中...' : '发布中...';
    
    try {
        const token = localStorage.getItem('token');
        let article;
        
        if (isEditing && currentArticleId) {
            // 更新已有文章
            const response = await fetch(`/api/articles/${currentArticleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, summary, content })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '保存失败');
            }
            
            article = await response.json();
        } else {
            // 创建新文章
            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, summary, content })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '发布失败');
            }
            
            article = await response.json();
        }
        
        // 处理标签
        const articleId = isEditing ? currentArticleId : article.id;
        if (tagsInput) {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
            for (const tagName of tags) {
                await fetch(`/api/articles/${articleId}/tags`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ tagName })
                });
            }
        }
        
        const message = isEditing ? '✅ 文章已保存！正在跳转...' : '✅ 文章发布成功！正在跳转...';
        showMessage(message, 'success');
        
        setTimeout(() => {
            window.location.href = `/article.html?id=${articleId}`;
        }, 1500);
        
    } catch (error) {
        console.error('操作失败:', error);
        showMessage('❌ ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = isEditing ? '保存修改' : '发布文章';
    }
}

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

cancelBtn.addEventListener('click', () => {
    window.location.href = '/';
});

submitBtn.addEventListener('click', publishArticle);

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        publishArticle();
    }
});