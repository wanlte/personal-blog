// config/features.js - 特性开关静态默认配置（DB 中无覆盖时生效）
module.exports = {
  // 新版文章编辑器，10% 用户灰度
  NEW_ARTICLE_EDITOR: {
    enabled: true,
    percentage: 10,
  },

  // 高级数据分析面板，仅管理员可用
  ADVANCED_ANALYTICS: {
    enabled: true,
    userIds: ['admin'],
  },

  // 支付系统 V2，定时上线
  PAYMENT_V2: {
    enabled: false,
    startDate: '2026-06-01',
  },
};
