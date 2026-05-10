// config/development.js - 开发环境配置
module.exports = {
  server: {
    nodeEnv: 'development',
  },
  log: {
    level: 'debug',
  },
  cors: {
    allowCyclic: false,
  },
};
