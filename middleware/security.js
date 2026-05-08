// middleware/security.js
// 安全中间件：Helmet 安全头 + CORS 跨域配置

const helmet = require('helmet');
const cors = require('cors');

// ============ Helmet 安全头配置 ============
const helmetConfig = {
  // Content Security Policy - 防止 XSS 攻击
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: [],
    },
    reportOnly: process.env.NODE_ENV === 'development' ? true : false,
  },
  
  // 防止点击劫持
  frameguard: {
    action: 'deny',
  },
  
  // 防止 MIME 类型 sniffing
  noSniff: true,
  
  // XSS 过滤设置
  xssFilter: true,
  
  // HSTS - 强制使用 HTTPS
  strictTransportSecurity: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true,
  },

  // Referrer-Policy - 控制 Referer 头信息
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // 禁用 DNS 预获取
  dnsPrefetchControl: {
    allow: false,
  },
  
  // 禁用 IE 的 X-Download-Options
  ieNoOpen: true,
  
  // 禁用 Firefox 的 X-Desktop-Browsing
  firefoxFragmentBarrier: true,
};

// ============ CORS 跨域配置 ============

// 构建允许的来源列表
function getAllowedOrigins() {
  const origins = [];

  // 开发环境：允许本地开发服务器
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5500'
    );
  }

  // 通过环境变量配置的生产域名（逗号分隔）
  const envOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '';
  envOrigins.split(',').forEach((o) => {
    const trimmed = o.trim();
    if (trimmed) origins.push(trimmed);
  });

  // 允许 cyclic.app 部署的子域名
  if (process.env.ALLOW_CYCLIC === 'true') {
    origins.push(/\.cyclic\.app$/);
  }

  return origins;
}

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: function (origin, callback) {
    // 无 origin 的请求（同源请求、服务器间调用、Postman）直接放行
    if (!origin) {
      callback(null, true);
      return;
    }

    // 精确匹配字符串，或正则匹配域名模式
    const allowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (allowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'Accept',
    'Origin',
    'Cache-Control',
  ],

  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],

  credentials: true,

  // 预检请求缓存 1 小时（生产）；开发环境缓存 10 分钟
  maxAge: process.env.NODE_ENV === 'development' ? 600 : 3600,

  optionsSuccessStatus: 204,
};

// ============ 导出中间件 ============
const securityMiddleware = [
  helmet(helmetConfig),
  cors(corsOptions),
];

module.exports = { securityMiddleware, helmetConfig, corsOptions };
