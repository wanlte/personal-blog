// 加载评论（支持嵌套回复）
async function loadComments(articleId) {
    const commentsList = document.getElementById('commentsList');

    try {
        const response = await fetch(`/api/articles/${articleId}/comments`);
        const comments = await response.json();

        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="empty">暂无评论，来说两句吧~</div>';
            return;
        }

        // 分离顶级评论和回复
        const topLevel = comments.filter(c => !c.parent_id);
        const replies = comments.filter(c => c.parent_id);

        commentsList.innerHTML = topLevel.map(comment => {
            const commentReplies = replies.filter(r => r.parent_id === comment.id);
            return `
                <div class="comment-item" data-id="${comment.id}">
                    <div class="comment-header">
                        <div class="comment-author-info">
                            <span class="comment-author">👤 ${escapeHtml(comment.user_name)}</span>
                        </div>
                        <span class="comment-time">${formatCommentDate(comment.created_at)}</span>
                        <button class="reply-btn" data-id="${comment.id}" data-name="${escapeHtml(comment.user_name)}">回复</button>
                        ${comment.user_id === currentUserId ? `<button class="delete-comment-btn" data-id="${comment.id}">删除</button>` : ''}
                    </div>
                    <div class="comment-content">${escapeHtml(comment.content)}</div>
                    ${commentReplies.length > 0 ? `
                        <div class="comment-replies">
                            ${commentReplies.map(reply => `
                                <div class="comment-item" data-id="${reply.id}">
                                    <div class="comment-header">
                                        <div class="comment-author-info">
                                            <span class="comment-author">👤 ${escapeHtml(reply.user_name)}</span>
                                            <span style="font-size:12px;color:var(--text-tertiary);">回复 @${escapeHtml(comment.user_name)}</span>
                                        </div>
                                        <span class="comment-time">${formatCommentDate(reply.created_at)}</span>
                                        ${reply.user_id === currentUserId ? `<button class="delete-comment-btn" data-id="${reply.id}">删除</button>` : ''}
                                    </div>
                                    <div class="comment-content">${escapeHtml(reply.content)}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="reply-form" id="replyForm-${comment.id}">
                        <textarea rows="2" placeholder="回复 @${escapeHtml(comment.user_name)}..."></textarea>
                        <div class="reply-form-actions">
                            <button class="btn btn-secondary cancel-reply-btn">取消</button>
                            <button class="btn btn-primary submit-reply-btn" data-id="${comment.id}">回复</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 绑定回复按钮
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const form = document.getElementById(`replyForm-${btn.dataset.id}`);
                if (form) {
                    // 关闭其他回复表单
                    document.querySelectorAll('.reply-form.active').forEach(f => {
                        if (f.id !== `replyForm-${btn.dataset.id}`) f.classList.remove('active');
                    });
                    form.classList.toggle('active');
                    if (form.classList.contains('active')) {
                        form.querySelector('textarea').focus();
                    }
                }
            });
        });

        // 绑定取消回复按钮
        document.querySelectorAll('.cancel-reply-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.reply-form').classList.remove('active');
            });
        });

        // 绑定提交回复按钮
        document.querySelectorAll('.submit-reply-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const form = document.getElementById(`replyForm-${btn.dataset.id}`);
                const textarea = form.querySelector('textarea');
                const content = textarea.value.trim();

                if (!content) {
                    alert('请输入回复内容');
                    return;
                }

                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/login.html';
                    return;
                }

                try {
                    const response = await fetch(`/api/articles/${articleId}/comments`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ content, parentId: parseInt(btn.dataset.id) })
                    });

                    if (response.ok) {
                        textarea.value = '';
                        form.classList.remove('active');
                        loadComments(articleId);
                    } else {
                        const error = await response.json();
                        alert(error.error || '回复失败');
                    }
                } catch (error) {
                    console.error('回复失败:', error);
                    alert('回复失败');
                }
            });
        });

        // 绑定删除按钮
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

// Escape HTML for XSS prevention
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
