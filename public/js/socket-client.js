// public/js/socket-client.js - 公共页面 WebSocket 客户端
const BlogSocket = (() => {
  let socket = null;
  let _onCommentNew = null;
  let _onCommentDeleted = null;

  function connect() {
    if (socket?.connected) return;

    const token = localStorage.getItem('token');

    socket = io({
      auth: { token: token || undefined },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      // 自动加入当前文章房间
      const articleId = getArticleIdFromURL();
      if (articleId) {
        socket.emit('join:article', articleId);
      }

      // 仪表盘页面自动加入公共看板房间
      if (window.location.pathname.includes('dashboard')) {
        socket.emit('join:dashboard');
      }
    });

    socket.on('comment:new', (comment) => {
      if (_onCommentNew) _onCommentNew(comment);
    });

    socket.on('comment:deleted', (data) => {
      if (_onCommentDeleted) _onCommentDeleted(data);
    });

    socket.on('online:count', (data) => {
      const el = document.getElementById('onlineCount');
      if (el) el.textContent = data.total;
    });

    socket.on('disconnect', () => {});

    // Token 变化时更新 auth
    window.addEventListener('storage', (e) => {
      if (e.key === 'token') {
        socket.auth = { token: e.newValue || undefined };
        socket.disconnect().connect();
      }
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  function getArticleIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') ? parseInt(params.get('id')) : null;
  }

  function onCommentNew(fn) { _onCommentNew = fn; }
  function onCommentDeleted(fn) { _onCommentDeleted = fn; }

  function joinArticle(articleId) {
    socket?.emit('join:article', articleId);
  }

  function leaveArticle(articleId) {
    socket?.emit('leave:article', articleId);
  }

  return { connect, disconnect, onCommentNew, onCommentDeleted, joinArticle, leaveArticle };
})();
