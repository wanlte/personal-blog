// config/base.js - 基础默认配置（所有环境共用）
module.exports = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: 'development',
    domain: 'localhost',
    siteName: '个人博客',
    siteUrl: 'http://localhost:3000',
  },

  database: {
    url: 'postgresql://postgres:123456@localhost:5432/blog?schema=public',
    poolSize: 10,
    connectionTimeout: 10000,
  },

  redis: {
    url: 'redis://localhost:6379',
    skip: false,
  },

  jwt: {
    secret: 'your-secret-key-change-me',
  },

  upload: {
    dir: 'uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },

  mail: {
    host: 'smtp.qq.com',
    port: 465,
    user: '',
    pass: '',
    from: '',
  },

  thirdParty: {
    github: {
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/auth/github/callback',
    },
    google: {
      clientId: '',
      clientSecret: '',
      callbackUrl: 'http://localhost:3000/api/auth/google/callback',
    },
  },

  cors: {
    frontendUrl: 'http://localhost:3000',
    allowedOrigins: '',
    allowCyclic: false,
  },

  log: {
    level: 'info',
    dir: '',
  },

  backup: {
    dir: '',
    keepDaily: 7,
    keepWeekly: 4,
    notificationEmail: '',
    storageSpaceAlertGB: 5,
    s3: {
      endpoint: '',
      region: 'us-east-1',
      bucket: '',
      accessKey: '',
      secretKey: '',
    },
  },

  audit: {
    retentionDays: 30,
    enabled: true,
  },

  encryption: {
    key: '',              // ENCRYPTION_KEY — 64 字符十六进制（256-bit）
    iv: '',               // ENCRYPTION_IV — 可选，用于密钥派生盐值
    previousKeys: '',     // ENCRYPTION_PREVIOUS_KEYS — 旧版本密钥（仅解密）
    pbkdf2Iterations: 10000,
  },

  featureFlags: {
    enabled: true,
    cache: {
      ttl: 300,           // per-flag 结果缓存 TTL（秒）
      allTtl: 600,        // 批量评估缓存 TTL（秒）
      configTtl: 3600,    // DB 配置缓存 TTL（秒）
    },
  },
};
