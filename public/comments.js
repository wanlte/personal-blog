// 加载评论
async function loadComments(articleId) {
    const commentsList = document.getElementById('commentsList');
    
    try {
        const response = await fetch(`/api/articles/${articleId}/comments`);
        const comments = await response.json();
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="empty">暂无评论，来说两句吧~</div>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => `
            <div class="comment-item" data-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">👤 ${escapeHtml(comment.user_name)}</span>
                    <span class="comment-time">${formatCommentDate(comment.created_at)}</span>
                    ${comment.user_id === currentUserId ? `<button class="delete-comment-btn" data-id="${comment.id}">删除</button>` : ''}
                </div>
                <div class="comment-content">${escapeHtml(comment.content)}</div>
            </div>
        `).join('');
        
        // 绑定删除按钮事件
        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('确定要删除这条评论吗？')) {
                    const commentId = btn.dataset.id;
                    const response = await fetch(`/api/comments/${commentId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    if (response.ok) {
                        loadComments(articleId);
                    } else {
                        alert('删除失败');
                    }
                }
            });
        });
        
    } catch (error) {
        console.error('加载评论失败:', error);
        commentsList.innerHTML = '<div class="error">加载评论失败</div>';
    }
}

// 发表评论
async function submitComment(articleId) {
    const content = document.getElementById('commentContent').value.trim();
    
    if (!content) {
        alert('请输入评论内容');
        return;
    }
    
    const token = localStorage.getItem('token');
    let userName = null;
    
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userName = payload.username;
        } catch (e) {}
    }
    
    try {
        const response = await fetch(`/api/articles/${articleId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify({ 
                content: content,
                userName: userName
            })
        });
        
        if (response.ok) {
            document.getElementById('commentContent').value = '';
            loadComments(articleId);
        } else {
            const error = await response.json();
            alert(error.error || '发表评论失败');
        }
    } catch (error) {
        console.error('发表评论失败:', error);
        alert('发表评论失败');
    }
}

// 格式化评论日期
function formatCommentDate(dateStr) {
    if (!dateStr) return '刚刚';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    
    if (diff < 1) return '刚刚';
    if (diff < 60) return `${diff}分钟前`;
    if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 显示当前用户状态
function updateCommentUserInfo() {
    const token = localStorage.getItem('token');
    const userInfoDiv = document.getElementById('commentUserInfo');
    
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userInfoDiv.innerHTML = `<span class="user-badge">✍️ ${escapeHtml(payload.username)}</span>`;
        } catch (e) {}
    } else {
        userInfoDiv.innerHTML = `<span class="user-badge-warning">⚠️ 登录后发表评论</span>`;
    }
}