// config/index.js - 配置入口（dotenv 加载 + 多级合并）
const dotenv = require('dotenv');
const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const ROOT_DIR = path.resolve(__dirname, '..');

// ============ 加载 .env 文件 ============
// dotenv 默认不覆盖已存在的环境变量，因此按优先级从高到低加载：
// .env.local（最高优先级，本地覆盖）→ .env.{NODE_ENV} → .env（兜底默认值）

const envFiles = [
  '.env.local',
  `.env.${NODE_ENV}`,
  '.env',
];

for (const file of envFiles) {
  const filePath = path.join(ROOT_DIR, file);
  dotenv.config({ path: filePath });
}

// ============ 深度合并 ============
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] != null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof result[key] === 'object' &&
      result[key] != null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ============ 合并 JS 配置：base → env-specific ============
const baseConfig = require('./base');

let envConfig = {};
try {
  envConfig = require(`./${NODE_ENV}`);
} catch (e) {
  if (e.code !== 'MODULE_NOT_FOUND') throw e;
}

const merged = deepMerge(baseConfig, envConfig);

// ============ 将 process.env 映射到 config 对象 ============
// 仅当环境变量存在且非空字符串时才覆盖
const envMapping = {
  'server.port':           ['PORT',            parseInt],
  'server.nodeEnv':        ['NODE_ENV'],
  'server.siteName':       ['SITE_NAME'],
  'server.siteUrl':        ['SITE_URL'],
  'database.url':          ['DATABASE_URL'],
  'database.poolSize':     ['DATABASE_POOL_SIZE', parseInt],
  'database.connectionTimeout': ['DATABASE_CONNECTION_TIMEOUT', parseInt],
  'redis.url':             ['REDIS_URL'],
  'redis.skip':            ['SKIP_REDIS',      v => v === 'true'],
  'jwt.secret':            ['JWT_SECRET'],
  'mail.host':             ['SMTP_HOST'],
  'mail.port':             ['SMTP_PORT',       parseInt],
  'mail.user':             ['SMTP_USER'],
  'mail.pass':             ['SMTP_PASS'],
  'mail.from':             ['SMTP_FROM'],
  'cors.frontendUrl':      ['FRONTEND_URL'],
  'cors.allowedOrigins':   ['ALLOWED_ORIGINS'],
  'cors.allowCyclic':      ['ALLOW_CYCLIC',    v => v === 'true'],
  'log.level':             ['LOG_LEVEL'],
  'log.dir':               ['LOG_DIR'],
  'backup.dir':                 ['BACKUP_DIR'],
  'backup.keepDaily':            ['BACKUP_KEEP_DAILY',     parseInt],
  'backup.keepWeekly':           ['BACKUP_KEEP_WEEKLY',    parseInt],
  'backup.notificationEmail':    ['BACKUP_NOTIFY_EMAIL'],
  'backup.storageSpaceAlertGB':  ['BACKUP_SPACE_ALERT_GB', parseInt],
  'backup.s3.endpoint':          ['BACKUP_S3_ENDPOINT'],
  'backup.s3.region':            ['BACKUP_S3_REGION'],
  'backup.s3.bucket':            ['BACKUP_S3_BUCKET'],
  'backup.s3.accessKey':         ['BACKUP_S3_ACCESS_KEY'],
  'backup.s3.secretKey':         ['BACKUP_S3_SECRET_KEY'],
  'thirdParty.github.clientId':     ['GITHUB_CLIENT_ID'],
  'thirdParty.github.clientSecret': ['GITHUB_CLIENT_SECRET'],
  'thirdParty.github.callbackUrl':  ['GITHUB_CALLBACK_URL'],
  'thirdParty.google.clientId':     ['GOOGLE_CLIENT_ID'],
  'thirdParty.google.clientSecret': ['GOOGLE_CLIENT_SECRET'],
  'thirdParty.google.callbackUrl':  ['GOOGLE_CALLBACK_URL'],
  'encryption.key':          ['ENCRYPTION_KEY'],
  'encryption.iv':           ['ENCRYPTION_IV'],
  'encryption.previousKeys': ['ENCRYPTION_PREVIOUS_KEYS'],
  'featureFlags.enabled':          ['FEATURE_FLAGS_ENABLED', v => v === 'true'],
  'featureFlags.cache.ttl':        ['FEATURE_FLAG_CACHE_TTL',       parseInt],
  'featureFlags.cache.allTtl':     ['FEATURE_FLAG_CACHE_ALL_TTL',   parseInt],
  'featureFlags.cache.configTtl':  ['FEATURE_FLAG_CACHE_CONFIG_TTL', parseInt],
};

function setByPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

const config = JSON.parse(JSON.stringify(merged));

for (const [configPath, [envKey, transform]] of Object.entries(envMapping)) {
  const raw = process.env[envKey];
  if (raw !== undefined && raw !== '') {
    const value = transform ? transform(raw) : raw;
    if (value !== undefined && !Number.isNaN(value)) {
      setByPath(config, configPath, value);
    }
  }
}

// ============ 验证必需环境变量（dotenv-safe） ============
if (NODE_ENV !== 'test') {
  try {
    require('dotenv-safe').config({
      path: path.join(ROOT_DIR, '.env'),
      example: path.join(ROOT_DIR, '.env.example'),
      allowEmptyValues: true,
    });
  } catch (e) {
    if (NODE_ENV === 'production') {
      console.error('❌ 缺少必需的环境变量，请检查 .env.example');
      console.error(e.message);
      process.exit(1);
    } else {
      console.warn('⚠️  环境变量检查:', e.message.split('\n')[0]);
    }
  }
}

module.exports = config;
