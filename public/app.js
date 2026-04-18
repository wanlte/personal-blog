//=================1.工具类======================

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

// 转义正则表达式特殊字符
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 高亮关键词
function highlightKeyword(text, keyword) {
    if (!keyword || !text) return text;
    const regex = new RegExp(`(${escapeRegex(keyword)})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
}

//=================2.核心功能===============

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

//=================3.认证功能======================
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

//=================4.标签功能======================
// 修改标签加载函数，使用标签云样式
async function loadTags() {
    try {
        const response = await fetch('/api/tags');
        const tags = await response.json();
        const tagList = document.getElementById('tagList');
        
        if (tagList && tags.length > 0) {
            tagList.innerHTML = tags.map(tag => 
                `<span class="tag" data-tag="${escapeHtml(tag.name)}">${escapeHtml(tag.name)}</span>`
            ).join('');
            
            // 绑定筛选事件
            document.querySelectorAll('#tagList .tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    const tagName = tag.dataset.tag;
                    loadArticlesByTag(tagName);
                });
            });
        }
    } catch (error) {
        console.error('加载标签失败:', error);
    }
}

// 按标签筛选文章
async function loadArticlesByTag(tagName) {
    const articlesList = document.getElementById('articlesList');
    
    try {
        articlesList.innerHTML = '<div class="loading">🏷️ 筛选文章中...</div>';
        
        const response = await fetch(`/api/articles?tag=${encodeURIComponent(tagName)}`);
        const articles = await response.json();
        
        if (articles.length === 0) {
            articlesList.innerHTML = '<div class="empty">📭 没有找到相关标签的文章</div>';
            return;
        }
        
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
        console.error('筛选失败:', error);
        articlesList.innerHTML = '<div class="error">❌ 筛选失败</div>';
    }
}

//=================5.搜索功能======================
// 搜索文章
async function searchArticles() {
    const keyword = document.getElementById('searchInput').value.trim();
    
    if (!keyword) {
        loadArticles();  // 没有关键词，加载全部文章
        return;
    }
    
    const articlesList = document.getElementById('articlesList');
    
    try {
        articlesList.innerHTML = '<div class="loading">🔍 搜索中...</div>';
        
        const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
        
        if (!response.ok) {
            throw new Error('搜索失败');
        }
        
        const articles = await response.json();
        
        if (articles.length === 0) {
            articlesList.innerHTML = '<div class="empty">😢 没有找到相关文章</div>';
            return;
        }
        
        // 渲染搜索结果，高亮关键词
        articlesList.innerHTML = articles.map(article => `
            <div class="article-card" onclick="viewArticle(${article.id})">
                <h2 class="article-title">${highlightKeyword(escapeHtml(article.title), keyword)}</h2>
                <p class="article-summary">${highlightKeyword(escapeHtml(article.summary || '暂无摘要'), keyword)}</p>
                <div class="article-meta">
                    <span>✍️ ${escapeHtml(article.author_name || '匿名')}</span>
                    <span>📅 ${formatDate(article.created_at)}</span>
                    <span class="article-views">👁️ ${article.views} 次阅读</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('搜索失败:', error);
        articlesList.innerHTML = '<div class="error">❌ 搜索失败，请稍后重试</div>';
    }
}

// 清空搜索的按钮（可选）
function clearSearch() {
    document.getElementById('searchInput').value = '';
    loadArticles();
}


//=================6.排行榜功能======================
// 加载热门文章排行榜
async function loadPopularArticles() {
    const popularList = document.getElementById('popularList');
    
    if (!popularList) return;
    
    try {
        const response = await fetch('/api/popular?limit=5');
        const articles = await response.json();
        
        if (articles.length === 0) {
            popularList.innerHTML = '<div class="empty">暂无热门文章</div>';
            return;
        }
        
        popularList.innerHTML = articles.map((article, index) => {
            let rankClass = '';
            if (index === 0) rankClass = 'top1';
            else if (index === 1) rankClass = 'top2';
            else if (index === 2) rankClass = 'top3';
            
            return `
                <div class="popular-item" onclick="viewArticle(${article.id})">
                    <div class="popular-rank ${rankClass}">${index + 1}</div>
                    <div class="popular-info">
                        <div class="popular-title">${escapeHtml(article.title)}</div>
                        <div class="popular-views">👁️ ${article.views} 次阅读</div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('加载排行榜失败:', error);
        popularList.innerHTML = '<div class="error">加载失败</div>';
    }
}


// 页面加载时执行初始化操作
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    loadPopularArticles();  // 新增
    loadTags();
    checkAuth();
    
    // 绑定搜索事件
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', searchArticles);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchArticles();
            }
        });
    }
});