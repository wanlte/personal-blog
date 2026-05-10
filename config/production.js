// config/production.js - 生产环境配置
module.exports = {
  server: {
    nodeEnv: 'production',
  },
  log: {
    level: 'info',
  },
  cors: {
    allowCyclic: false,
  },
};
