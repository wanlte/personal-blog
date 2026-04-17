// 获取文章列表并显示
async function loadArticles() {
    const articlesList = document.getElementById('articlesList');
    
    try {
        // 显示加载中
        articlesList.innerHTML = '<div class="loading">📖 加载文章中...</div>';
        
        // 调用后端 API
        const response = await fetch('/api/articles');
        
        if (!response.ok) {
            throw new Error('网络请求失败');
        }
        
        const articles = await response.json();
        
        if (articles.length === 0) {
            articlesList.innerHTML = '<div class="empty">📭 暂无文章，请先添加</div>';
            return;
        }
        
        // 渲染文章列表
        articlesList.innerHTML = articles.map(article => `
            <div class="article-card" onclick="viewArticle(${article.id})">
                <h2 class="article-title">${escapeHtml(article.title)}</h2>
                <p class="article-summary">${escapeHtml(article.summary || '暂无摘要')}</p>
                <div class="article-meta">
                    <span>✍️ ${escapeHtml(article.author_name || '匿名')}</span>
                    <span>📅 ${formatDate(article.created_at)}</span>
                    <span class="article-views">👁️ ${article.views} 次阅读</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('加载失败:', error);
        articlesList.innerHTML = '<div class="error">❌ 加载失败，请检查服务器是否运行</div>';
    }
}

// 跳转到文章详情页
function viewArticle(id) {
    window.location.href = `/article.html?id=${id}`;
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '未知日期';
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 防止 XSS 攻击
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 检查登录状态
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userInfo = document.getElementById('userInfo');
    
    if (token && user) {
        userInfo.innerHTML = `
            <span>👤 ${user.username}</span>
            <button id="logoutBtn" class="logout-btn">退出</button>
        `;
        
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        });
    } else {
        userInfo.innerHTML = `<a href="/login.html" class="login-link">登录</a>`;
    }
}

checkAuth();

// 加载所有标签
async function loadTags() {
    const response = await fetch('/api/tags');
    const tags = await response.json();
    const tagList = document.getElementById('tagList');
    
    if (tagList && tags.length > 0) {
        tagList.innerHTML = tags.map(tag => 
            `<button class="tag-filter-btn" data-tag="${escapeHtml(tag.name)}">${escapeHtml(tag.name)}</button>`
        ).join('');
        
        // 绑定筛选事件
        document.querySelectorAll('.tag-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tagName = btn.dataset.tag;
                loadArticlesByTag(tagName);
            });
        });
    }
}

// 按标签筛选文章
async function loadArticlesByTag(tagName) {
    const response = await fetch(`/api/articles?tag=${encodeURIComponent(tagName)}`);
    const articles = await response.json();
    renderArticles(articles);
}

// 在页面加载时调用
loadTags();

// 页面加载时执行
loadArticles();