// 获取 URL 中的文章 ID
function getArticleId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// 加载文章详情
async function loadArticle() {
    const articleId = getArticleId();
    
    if (!articleId) {
        document.getElementById('articleDetail').innerHTML = '<div class="error">❌ 文章ID不存在</div>';
        return;
    }
    
    const articleDetail = document.getElementById('articleDetail');
    
    try {
        articleDetail.innerHTML = '<div class="loading">📖 加载文章中...</div>';
        
        const response = await fetch(`/api/articles/${articleId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('文章不存在');
            }
            throw new Error('网络请求失败');
        }
        
        const article = await response.json();
        
        // 渲染文章详情
        articleDetail.innerHTML = `
            <div class="article-detail">
                <h1 class="detail-title">${escapeHtml(article.title)}</h1>
                <div class="detail-meta">
                    <span>✍️ ${escapeHtml(article.author_name || '匿名')}</span>
                    <span>📅 ${formatDate(article.created_at)}</span>
                    <span>✏️ 更新于 ${formatDate(article.updated_at)}</span>
                    <span>👁️ ${article.views} 次阅读</span>
                </div>
                <div class="detail-content">
                    ${escapeHtml(article.content || '暂无内容').replace(/\n/g, '<br>')}
                </div>
                <div class="article-actions" id="articleActions">
                    <button id="editBtn" class="btn-edit">✏️ 编辑文章</button>
                    <button id="deleteBtn" class="btn-delete">🗑️ 删除文章</button>
                </div>
                <div class="back-link">
                    <a href="/">← 返回首页</a>
                </div>
            </div>
        `;
        
        // 获取当前登录用户信息
        const token = localStorage.getItem('token');
        let currentUser = null;
        
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUser = { id: payload.userId, username: payload.username };
            } catch (e) {
                console.error('解析token失败', e);
            }
        }
        
        // 判断是否是文章作者
        const isAuthor = currentUser && currentUser.id === article.user_id;
        
        // 根据权限显示/隐藏按钮
        const actionsDiv = document.getElementById('articleActions');
        if (actionsDiv) {
            if (isAuthor) {
                actionsDiv.style.display = 'flex';
                // 绑定编辑按钮
                document.getElementById('editBtn')?.addEventListener('click', () => {
                    window.location.href = `/edit.html?id=${article.id}&title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary || '')}&content=${encodeURIComponent(article.content || '')}`;
                });
                
                // 绑定删除按钮
                document.getElementById('deleteBtn')?.addEventListener('click', async () => {
                    if (confirm('确定要删除这篇文章吗？')) {
                        try {
                            const response = await fetch(`/api/articles/${article.id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            if (response.ok) {
                                window.location.href = '/';
                            } else {
                                const data = await response.json();
                                alert(data.error || '删除失败');
                            }
                        } catch (err) {
                            console.error('删除错误:', err);
                            alert('删除失败，请稍后重试');
                        }
                    }
                });
            } else {
                actionsDiv.style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('加载失败:', error);
        if (error.message === '文章不存在') {
            document.getElementById('articleDetail').innerHTML = '<div class="error">❌ 文章不存在</div>';
        } else {
            document.getElementById('articleDetail').innerHTML = '<div class="error">❌ 加载失败，请检查服务器是否运行</div>';
        }
    }
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '未知日期';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 防止 XSS 攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 页面加载时执行
loadArticle();