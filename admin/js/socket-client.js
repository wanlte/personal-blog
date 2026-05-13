// admin/js/socket-client.js - 管理后台 WebSocket 客户端
const AdminSocket = (() => {
  let socket = null;
  let _onStatsUpdate = null;

  function connect() {
    if (socket?.connected) return;

    const token = localStorage.getItem('admin_token');

    socket = io({
      auth: { token: token || undefined },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      socket.emit('join:dashboard');
    });

    socket.on('stats:update', () => {
      if (_onStatsUpdate) _onStatsUpdate();
    });

    socket.on('online:count', (data) => {
      const el = document.getElementById('onlineCount');
      if (el) el.textContent = data.total;
    });

    socket.on('disconnect', () => {});
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  function onStatsUpdate(fn) { _onStatsUpdate = fn; }

  return { connect, disconnect, onStatsUpdate };
})();
