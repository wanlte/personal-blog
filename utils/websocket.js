// utils/websocket.js - WebSocket 实时通信模块
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');
const config = require('../config');
const logger = require('./logger');
const cache = require('./cache');

const JWT_SECRET = config.jwt.secret;

let io = null;
const onlineCount = { users: 0, guests: 0, admins: 0 };

function broadcastOnlineCount() {
  if (!io) return;
  const payload = {
    users: onlineCount.users,
    guests: onlineCount.guests,
    admins: onlineCount.admins,
    total: onlineCount.users + onlineCount.guests + onlineCount.admins,
  };
  io.to('public:dashboard').emit('online:count', payload);
  io.to('admin:stats').emit('online:count', payload);
}

function init(httpServer) {
  io = new Server(httpServer, {
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Redis adapter — 多实例部署时保证跨进程消息广播
  if (cache.isReady()) {
    try {
      const pubClient = cache.client.duplicate();
      const subClient = cache.client.duplicate();
      Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          io.adapter(createAdapter(pubClient, subClient));
          logger.info('Socket.io Redis adapter enabled');
        })
        .catch((err) => {
          logger.warn('Socket.io Redis adapter connect failed, using in-memory', { error: err.message });
        });
    } catch (err) {
      logger.warn('Socket.io Redis adapter init failed, using in-memory', { error: err.message });
    }
  }

  // JWT 认证
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.user = null;
      return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        socket.user = null;
      } else {
        socket.user = decoded;
      }
      next();
    });
  });

  io.on('connection', (socket) => {
    // 在线人数统计
    if (socket.user?.isAdmin) {
      onlineCount.admins++;
    } else if (socket.user?.userId) {
      onlineCount.users++;
    } else {
      onlineCount.guests++;
    }
    broadcastOnlineCount();

    // 自动加入用户房间
    if (socket.user?.userId) {
      socket.join(`user:${socket.user.userId}`);
    }
    // 管理员自动加入管理看板房间
    if (socket.user?.isAdmin) {
      socket.join('admin:stats');
    }

    // 客户端请求加入文章房间
    socket.on('join:article', (articleId) => {
      if (articleId) socket.join(`article:${articleId}`);
    });

    socket.on('leave:article', (articleId) => {
      if (articleId) socket.leave(`article:${articleId}`);
    });

    // 客户端请求加入公共看板房间
    socket.on('join:dashboard', () => {
      socket.join('public:dashboard');
    });

    socket.on('leave:dashboard', () => {
      socket.leave('public:dashboard');
    });

    socket.on('disconnect', () => {
      if (socket.user?.isAdmin) {
        onlineCount.admins = Math.max(0, onlineCount.admins - 1);
      } else if (socket.user?.userId) {
        onlineCount.users = Math.max(0, onlineCount.users - 1);
      } else {
        onlineCount.guests = Math.max(0, onlineCount.guests - 1);
      }
      broadcastOnlineCount();
    });
  });

  logger.info('Socket.io initialized');
  return io;
}

function getIO() {
  return io;
}

function emitToArticle(articleId, event, data) {
  io?.to(`article:${articleId}`).emit(event, data);
}

function emitToUser(userId, event, data) {
  io?.to(`user:${userId}`).emit(event, data);
}

function emitToAdmin(event, data) {
  io?.to('admin:stats').emit(event, data);
}

function emitToDashboard(event, data) {
  io?.to('public:dashboard').emit(event, data);
}

async function shutdown() {
  if (io) {
    return new Promise((resolve) => {
      io.close(() => {
        logger.info('Socket.io closed');
        resolve();
      });
    });
  }
}

module.exports = {
  init,
  getIO,
  emitToArticle,
  emitToUser,
  emitToAdmin,
  emitToDashboard,
  shutdown,
};
