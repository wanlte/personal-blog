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
        
       // 渲染文章列表时，为所有图片添加 loading="lazy"
    articlesList.innerHTML = articles.map(article => `
        <div class="article-card ${article.is_pinned === 1 ? 'pinned' : ''}" onclick="viewArticle(${article.id})">
            <div class="card-content">
                <div class="article-header">
                    ${article.is_pinned === 1 ? '<span class="pinned-badge">📌 置顶</span>' : ''}
                    ${article.is_paid == 1 ? `<span class="paid-badge"><span class="lock-icon">🔒</span> 付费</span>` : ''}
                </div>
                <h2 class="article-title">${escapeHtml(article.title)}</h2>
                <p class="article-summary">${escapeHtml(article.summary || '暂无摘要')}</p>
                <div class="article-meta">
                    <span>✍️ ${escapeHtml(article.author_name || '匿名')}</span>
                    <span>📅 ${formatDate(article.created_at)}</span>
                    <span class="article-views">👁️ ${article.views} 次阅读</span>
                </div>
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
    const memberEntry = document.getElementById('memberEntry');

    if (token && user) {
        userInfo.innerHTML = `
            <div class="nav-user-menu">
                <span class="nav-user-name">${escapeHtml(user.username)}</span>
                <button id="logoutBtn" class="btn btn-ghost" style="padding:6px 12px;font-size:13px;">退出</button>
            </div>
        `;

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        });

        // 检查用户订阅状态
        checkSubscriptionStatus(token);
    } else {
        userInfo.innerHTML = `<a href="/login.html" class="btn btn-ghost" style="padding:6px 12px;font-size:13px;">登录</a>`;
        if (memberEntry) {
            memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn">💎 会员</a>`;
        }
    }
}

// 检查订阅状态 - 显示会员入口
async function checkSubscriptionStatus(token) {
    const memberEntry = document.getElementById('memberEntry');
    if (!memberEntry) return;

    try {
        const response = await fetch('/api/subscription/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.hasSubscription) {
            memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn premium">💎 ${data.subscription.planName}</a>`;
        } else {
            memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn">💎 开通会员</a>`;
        }
    } catch (error) {
        memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn">💎 会员</a>`;
    }
}

// 加载热门作者
async function loadPopularAuthors() {
    const authorList = document.getElementById('popularAuthorsList');
    if (!authorList) return;

    try {
        const response = await fetch('/api/authors/popular');
        const authors = await response.json();

        if (authors.length === 0) {
            authorList.innerHTML = '<div class="empty">暂无作者</div>';
            return;
        }

        authorList.innerHTML = authors.map(author => `
            <div class="author-card">
                <div class="author-avatar-sm">${author.avatar ? `<img src="${author.avatar}" alt="${escapeHtml(author.username)}">` : escapeHtml(author.username.charAt(0).toUpperCase())}</div>
                <div class="author-info-sm">
                    <div class="author-name-sm">
                        ${escapeHtml(author.username)}
                        ${author.isVerified ? '<span class="creator-badge verified"></span>' : ''}
                    </div>
                    <div class="author-meta-sm">${author.articleCount} 篇文章 · ${author.followerCount} 关注</div>
                </div>
                <button class="follow-btn-sm" data-user-id="${author.id}">关注</button>
            </div>
        `).join('');

        // 绑定关注按钮（POST关注 / DELETE取消）
        document.querySelectorAll('.follow-btn-sm').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const userId = btn.dataset.userId;
                const token = localStorage.getItem('token');

                if (!token) {
                    window.location.href = '/login.html';
                    return;
                }

                const isFollowing = btn.classList.contains('following');
                const method = isFollowing ? 'DELETE' : 'POST';

                try {
                    const response = await fetch(`/api/users/${userId}/follow`, {
                        method,
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        btn.textContent = data.following ? '已关注' : '关注';
                        btn.classList.toggle('following', data.following);
                    } else {
                        // 状态冲突时强制切换
                        btn.classList.toggle('following');
                        btn.textContent = btn.classList.contains('following') ? '已关注' : '关注';
                    }
                } catch (error) {
                    console.error('关注操作失败:', error);
                }
            });
        });
    } catch (error) {
        console.error('加载热门作者失败:', error);
        authorList.innerHTML = '<div class="error">加载失败</div>';
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
                <div class="card-content">
                    <div class="article-header">
                        ${article.is_paid == 1 ? `<span class="paid-badge"><span class="lock-icon">🔒</span> 付费</span>` : ''}
                    </div>
                    <h2 class="article-title">${escapeHtml(article.title)}</h2>
                    <p class="article-summary">${escapeHtml(article.summary || '暂无摘要')}</p>
                    <div class="article-meta">
                        <span>✍️ ${escapeHtml(article.author_name || '匿名')}</span>
                        <span>📅 ${formatDate(article.created_at)}</span>
                        <span class="article-views">👁️ ${article.views} 次阅读</span>
                    </div>
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
                <div class="card-content">
                    <div class="article-header">
                        ${article.is_paid == 1 ? `<span class="paid-badge"><span class="lock-icon">🔒</span> 付费</span>` : ''}
                    </div>
                    <h2 class="article-title">${highlightKeyword(escapeHtml(article.title), keyword)}</h2>
                    <p class="article-summary">${highlightKeyword(escapeHtml(article.summary || '暂无摘要'), keyword)}</p>
                    <div class="article-meta">
                        <span>✍️ ${escapeHtml(article.author_name || '匿名')}</span>
                        <span>📅 ${formatDate(article.created_at)}</span>
                        <span class="article-views">👁️ ${article.views} 次阅读</span>
                    </div>
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

// ================= 7. 归档功能 =================

// 加载文章归档
async function loadArchive() {
    const archiveList = document.getElementById('archiveList');
    
    if (!archiveList) return;
    
    try {
        const response = await fetch('/api/archive');
        const archives = await response.json();
        
        if (archives.length === 0) {
            archiveList.innerHTML = '<div class="empty">暂无文章</div>';
            return;
        }
        
        archiveList.innerHTML = archives.map(archive => {
            // 格式化月份显示
            const year = archive.year;
            const month = archive.month;
            const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            const displayMonth = `${year}年 ${monthNames[parseInt(month) - 1]}`;
            
            return `
                <div class="archive-item" data-yearmonth="${archive.year_month}" onclick="loadArchiveArticles('${archive.year_month}')">
                    <span class="archive-month">📅 ${displayMonth}</span>
                    <span class="archive-count">${archive.count} 篇</span>
                </div>
            `;
        }).join('');
        
        // 清除高亮
        document.querySelectorAll('.archive-item').forEach(item => {
            item.classList.remove('active');
        });
        
    } catch (error) {
        console.error('加载归档失败:', error);
        archiveList.innerHTML = '<div class="error">加载失败</div>';
    }
}

// 按月份筛选文章
async function loadArchiveArticles(yearMonth) {
    const articlesList = document.getElementById('articlesList');
    
    try {
        articlesList.innerHTML = '<div class="loading">📁 加载文章中...</div>';
        
        const response = await fetch(`/api/archive/${yearMonth}`);
        const articles = await response.json();
        
        if (articles.length === 0) {
            articlesList.innerHTML = '<div class="empty">📭 该月份暂无文章</div>';
            return;
        }
        
        // 渲染文章列表
        articlesList.innerHTML = articles.map(article => `
            <div class="article-card" onclick="viewArticle(${article.id})">
                <div class="card-content">
                    <div class="article-header">
                        ${article.is_paid == 1 ? `<span class="paid-badge"><span class="lock-icon">🔒</span> 付费</span>` : ''}
                    </div>
                    <h2 class="article-title">${escapeHtml(article.title)}</h2>
                    <p class="article-summary">${escapeHtml(article.summary || '暂无摘要')}</p>
                    <div class="article-meta">
                        <span>✍️ ${escapeHtml(article.author_name || '匿名')}</span>
                        <span>📅 ${formatDate(article.created_at)}</span>
                        <span class="article-views">👁️ ${article.views} 次阅读</span>
                    </div>
                </div>
            </div>
        `).join('');

        // 高亮当前选中的归档项
        document.querySelectorAll('.archive-item').forEach(item => {
            if (item.dataset.yearmonth === yearMonth) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // 可选：在页面顶部显示当前筛选信息
        const yearMonthStr = yearMonth.replace('-', '年 ') + '月';
        if (!document.getElementById('filterInfo')) {
            const filterInfo = document.createElement('div');
            filterInfo.id = 'filterInfo';
            filterInfo.className = 'filter-info';
            articlesList.parentNode.insertBefore(filterInfo, articlesList);
        }
        document.getElementById('filterInfo').innerHTML = `
            <div class="filter-banner">
                📁 正在查看：${yearMonthStr} 的文章 
                <button onclick="clearFilter()" class="clear-filter">✕ 清除筛选</button>
            </div>
        `;
        
    } catch (error) {
        console.error('加载归档文章失败:', error);
        articlesList.innerHTML = '<div class="error">❌ 加载失败</div>';
    }
}

// 清除筛选，显示全部文章
function clearFilter() {
    loadArticles();
    document.querySelectorAll('.archive-item').forEach(item => {
        item.classList.remove('active');
    });
    const filterInfo = document.getElementById('filterInfo');
    if (filterInfo) {
        filterInfo.remove();
    }
}


// 导航栏滚动毛玻璃效果
let lastScrollY = 0;
function handleNavScroll() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const scrollY = window.scrollY;
    lastScrollY = scrollY;
    if (scrollY > 20) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
}

// 页面加载时执行初始化操作
document.addEventListener('DOMContentLoaded', () => {
    loadArticles();
    loadPopularArticles();
    loadPopularAuthors();
    loadTags();
    loadArchive();
    checkAuth();

    // 初始化 WebSocket
    if (typeof BlogSocket !== 'undefined') {
        BlogSocket.connect();
    }

    // 导航栏滚动效果
    handleNavScroll();
    window.addEventListener('scroll', handleNavScroll, { passive: true });

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