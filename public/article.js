let currentUserId = null;
let currentArticle = null;

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
        currentArticle = article;

        // 设置页面标题
        document.title = `${article.title} - 个人博客`;

        // 添加 meta description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = article.summary || article.content?.substring(0, 150) || '文章详情';

        // 设置 Open Graph 标签
        let ogTitle = document.getElementById('og-title');
        if (ogTitle) ogTitle.setAttribute('content', article.title);

        let ogDesc = document.getElementById('og-description');
        if (ogDesc) ogDesc.setAttribute('content', article.summary || (article.content ? article.content.substring(0, 150) : ''));

        let ogUrl = document.getElementById('og-url');
        if (ogUrl) ogUrl.setAttribute('content', window.location.href);

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

        currentUserId = currentUser ? currentUser.id : null;
        const isAuthor = currentUser && currentUser.id === article.user_id;

        // 渲染文章详情
        articleDetail.innerHTML = `
            <div class="article-detail">
                ${article.is_paid == 1 ? '<span class="paid-badge" style="margin-bottom:12px;display:inline-flex;"><span class="lock-icon">🔒</span> 付费文章</span>' : ''}
                <h1 class="detail-title">${escapeHtml(article.title)}</h1>
                <div class="detail-meta">
                    <span>✍️ ${escapeHtml(article.author_name || '匿名')}</span>
                    <span>📅 ${formatDate(article.created_at)}</span>
                    <span>✏️ 更新于 ${formatDate(article.updated_at)}</span>
                    <span>👁️ ${article.views} 次阅读</span>
                    <span>❤️ ${article.like_count || 0}</span>
                    <span>⭐ ${article.collect_count || 0}</span>
                </div>
                <div class="detail-content markdown-body" id="articleContent">
                    ${marked.parse(article.content || '暂无内容')}
                </div>
                <div class="article-tags" id="articleTags"></div>

                <!-- 互动按钮栏 -->
                <div class="interaction-bar">
                    <button id="likeBtn" class="interaction-btn ${article.is_liked ? 'active' : ''}">
                        <span class="icon">${article.is_liked ? '❤️' : '🤍'}</span>
                        <span class="count" id="likeCount">${article.like_count || 0}</span>
                        <span>点赞</span>
                    </button>
                    <button id="collectBtn" class="interaction-btn ${article.is_collected ? 'fav-active' : ''}">
                        <span class="icon">${article.is_collected ? '⭐' : '☆'}</span>
                        <span class="count" id="collectCount">${article.collect_count || 0}</span>
                        <span>收藏</span>
                    </button>
                </div>

                <div class="article-actions" id="articleActions">
                    <button id="pinBtn" class="btn-pin">📌 置顶</button>
                    <button id="editBtn" class="btn-edit">✏️ 编辑文章</button>
                    <button id="deleteBtn" class="btn-delete">🗑️ 删除文章</button>
                </div>
                <div class="back-link">
                    <a href="/">← 返回首页</a>
                </div>
            </div>
        `;

        // 加载标签
        loadArticleTags(articleId);

        // 加载创作者信息
        if (article.user_id) {
            loadCreatorInfo(article.user_id, article);
        }

        // 绑定点赞/收藏按钮
        bindInteractionButtons(articleId);

        // 检查付费文章访问权限
        if (article.is_paid == 1) {
            checkArticleAccess(articleId, article);
        }

        // 根据权限显示/隐藏操作按钮
        const actionsDiv = document.getElementById('articleActions');
        if (actionsDiv) {
            if (isAuthor) {
                actionsDiv.style.display = 'flex';
                setupAuthorActions(article, token);
            } else {
                actionsDiv.style.display = 'none';
            }
        }

        // 加载评论
        await loadComments(articleId);

        // 绑定发表评论按钮
        document.getElementById('submitCommentBtn')?.addEventListener('click', () => {
            submitComment(articleId);
        });

    } catch (error) {
        console.error('加载失败:', error);
        if (error.message === '文章不存在') {
            document.getElementById('articleDetail').innerHTML = '<div class="error">❌ 文章不存在</div>';
        } else {
            document.getElementById('articleDetail').innerHTML = '<div class="error">❌ 加载失败，请检查服务器是否运行</div>';
        }
    }
}

// 加载文章标签
async function loadArticleTags(articleId) {
    try {
        const response = await fetch(`/api/articles/${articleId}/tags`);
        const tags = await response.json();
        const tagsContainer = document.getElementById('articleTags');
        if (tagsContainer && tags.length > 0) {
            tagsContainer.innerHTML = tags.map(tag =>
                `<span class="tag">${escapeHtml(tag.name)}</span>`
            ).join('');
        }
    } catch (error) {
        console.error('加载标签失败:', error);
    }
}

// 加载创作者信息栏（使用文章API返回的互动数据）
async function loadCreatorInfo(userId, article) {
    const container = document.getElementById('creatorInfoBar');
    if (!container) return;

    try {
        const response = await fetch(`/api/users/${userId}`);
        const user = await response.json();

        container.style.display = 'block';
        container.innerHTML = `
            <div class="creator-info-bar">
                <div class="creator-avatar">${user.avatar ? `<img src="${user.avatar}" alt="${escapeHtml(user.username)}">` : escapeHtml(user.username.charAt(0).toUpperCase())}</div>
                <div class="creator-info">
                    <div class="creator-name">
                        ${escapeHtml(user.username)}
                        ${user.isVerified ? '<span class="creator-badge verified"></span>' : ''}
                        ${user.bio ? `<span style="font-size:13px;color:var(--text-tertiary);font-weight:400;margin-left:4px;">${escapeHtml(user.bio)}</span>` : ''}
                    </div>
                    <div class="creator-stats">
                        <span>📝 ${user.articleCount} 篇文章</span>
                        <span id="followerCount">👥 ${article.author_follower_count || user.followerCount} 关注</span>
                    </div>
                </div>
                <button id="followAuthorBtn" class="follow-btn ${article.is_following_author ? 'following' : ''}" data-user-id="${user.id}">${article.is_following_author ? '已关注' : '关注'}</button>
            </div>
        `;

        // 绑定关注按钮（POST = 关注，DELETE = 取消关注）
        document.getElementById('followAuthorBtn')?.addEventListener('click', async function() {
            const token = localStorage.getItem('token');
            if (!token) { window.location.href = '/login.html'; return; }

            const isFollowing = this.classList.contains('following');
            const method = isFollowing ? 'DELETE' : 'POST';

            try {
                const res = await fetch(`/api/users/${this.dataset.userId}/follow`, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    this.textContent = data.following ? '已关注' : '关注';
                    this.classList.toggle('following', data.following);
                    document.getElementById('followerCount').textContent = `👥 ${data.count} 关注`;
                } else if (res.status === 409) {
                    // 已关注状态，需要切换为取消
                    this.classList.add('following');
                    this.textContent = '已关注';
                }
            } catch (error) {
                console.error('操作关注失败:', error);
            }
        });
    } catch (error) {
        console.error('加载创作者信息失败:', error);
    }
}

// 绑定点赞/收藏按钮（使用POST/DELETE分离）
function bindInteractionButtons(articleId) {
    // 点赞按钮
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn) {
        likeBtn.addEventListener('click', async function() {
            const token = localStorage.getItem('token');
            if (!token) { window.location.href = '/login.html'; return; }

            const isLiked = this.classList.contains('active');
            const method = isLiked ? 'DELETE' : 'POST';

            try {
                const res = await fetch(`/api/articles/${articleId}/like`, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                // 409 = 已点赞（切换时忽略），404 = 未点赞（切换时忽略）
                if (res.status === 409 || res.status === 404) {
                    // 状态与预期不符，强制切换
                    this.classList.toggle('active');
                    this.querySelector('.icon').textContent = this.classList.contains('active') ? '❤️' : '🤍';
                    return;
                }
                const data = await res.json();
                this.classList.toggle('active', data.liked);
                this.querySelector('.icon').textContent = data.liked ? '❤️' : '🤍';
                document.getElementById('likeCount').textContent = data.count;
            } catch (e) { console.error('操作点赞失败:', e); }
        });
    }

    // 收藏按钮
    const collectBtn = document.getElementById('collectBtn');
    if (collectBtn) {
        collectBtn.addEventListener('click', async function() {
            const token = localStorage.getItem('token');
            if (!token) { window.location.href = '/login.html'; return; }

            const isCollected = this.classList.contains('fav-active');
            const method = isCollected ? 'DELETE' : 'POST';

            try {
                const res = await fetch(`/api/articles/${articleId}/collect`, {
                    method,
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 409 || res.status === 404) {
                    this.classList.toggle('fav-active');
                    this.querySelector('.icon').textContent = this.classList.contains('fav-active') ? '⭐' : '☆';
                    return;
                }
                const data = await res.json();
                this.classList.toggle('fav-active', data.collected);
                this.querySelector('.icon').textContent = data.collected ? '⭐' : '☆';
                document.getElementById('collectCount').textContent = data.count;
            } catch (e) { console.error('操作收藏失败:', e); }
        });
    }
}

// 检查付费文章访问权限
async function checkArticleAccess(articleId, article) {
    const container = document.getElementById('paywallOverlay');
    if (!container) return;

    try {
        const res = await fetch(`/api/articles/${articleId}/access`);
        const data = await res.json();

        if (data.hasAccess) return; // 有权限，不显示遮罩

        container.style.display = 'block';

        const contentDiv = document.getElementById('articleContent');
        if (contentDiv) {
            contentDiv.innerHTML = `
                <div class="paywall-overlay">
                    <div class="paywall-blur">
                        ${contentDiv.innerHTML}
                    </div>
                    <div class="paywall-cta">
                        <span class="lock-big">🔒</span>
                        <h3>付费文章</h3>
                        <p>本文为付费内容，订阅或购买后即可阅读全文</p>
                        <div class="paywall-price">¥${Number(article.price || data.price).toFixed(2)} <small>一次性购买</small></div>
                        ${data.canPurchase
                            ? `<button id="purchaseBtn" class="btn btn-buy" style="padding:14px 40px;font-size:16px;">🔓 立即解锁</button>
                               <div class="paywall-notice">或 <a href="/subscribe.html" style="color:var(--gradient-start);">订阅会员</a> 免费阅读</div>`
                            : `<a href="/login.html" class="btn btn-primary" style="padding:14px 40px;font-size:16px;">登录后购买</a>`
                        }
                    </div>
                </div>
            `;

            document.getElementById('purchaseBtn')?.addEventListener('click', async function() {
                const token = localStorage.getItem('token');
                if (!token) { window.location.href = '/login.html'; return; }
                this.disabled = true;
                this.textContent = '处理中...';
                try {
                    const res = await fetch(`/api/articles/${articleId}/purchase`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const result = await res.json();
                    if (result.purchased) {
                        alert('购买成功！');
                        window.location.reload();
                    } else {
                        alert(result.error || '购买失败');
                        this.disabled = false;
                        this.textContent = '🔓 立即解锁';
                    }
                } catch (e) {
                    alert('购买失败');
                    this.disabled = false;
                    this.textContent = '🔓 立即解锁';
                }
            });
        }
    } catch (error) {
        console.error('检查访问权限失败:', error);
    }
}

// 设置作者操作按钮
function setupAuthorActions(article, token) {
    // 置顶按钮
    const pinBtn = document.getElementById('pinBtn');
    if (pinBtn) {
        pinBtn.textContent = article.is_pinned === 1 ? '📍 已置顶' : '📌 置顶';
        pinBtn.style.background = article.is_pinned === 1 ? '#10b981' : '#667eea';
        pinBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`/api/articles/${article.id}/pin`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    window.location.reload();
                } else {
                    alert('操作失败');
                }
            } catch (err) {
                console.error('置顶失败:', err);
                alert('操作失败');
            }
        });
    }

    // 编辑按钮
    document.getElementById('editBtn')?.addEventListener('click', () => {
        window.location.href = `/edit.html?id=${article.id}&title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary || '')}&content=${encodeURIComponent(article.content || '')}`;
    });

    // 删除按钮
    document.getElementById('deleteBtn')?.addEventListener('click', async () => {
        if (confirm('确定要删除这篇文章吗？')) {
            try {
                const response = await fetch(`/api/articles/${article.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
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
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadArticle();
});

// 认证与会员入口
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
        checkSubscriptionStatus(token);
    } else {
        userInfo.innerHTML = `<a href="/login.html" class="btn btn-ghost" style="padding:6px 12px;font-size:13px;">登录</a>`;
        if (memberEntry) {
            memberEntry.innerHTML = `<a href="/subscribe.html" class="nav-member-btn">💎 会员</a>`;
        }
    }
}

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
