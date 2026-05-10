// utils/featureFlags.js - 特性开关核心评估引擎
const crypto = require('crypto');
const config = require('../config');
const cache = require('./cache');
const logger = require('./logger');
const staticFlags = require('../config/features');

const FLAG_CONFIG_PREFIX = 'feature:flag:config:';
const FLAG_RESULT_PREFIX = 'feature:flag:result:';
const FLAG_ALL_PREFIX = 'feature:flag:all:user:';
const FLAG_VERSION_KEY = 'feature:flag:__version__';

// ============== 公开 API ==============

/**
 * 评估单个特性开关
 * @param {string} flagName
 * @param {number|null} userId
 * @param {{ isAdmin?: boolean, role?: string }} [userMeta]
 * @returns {Promise<boolean>}
 */
async function getFeatureFlag(flagName, userId = null, userMeta = null) {
  if (!config.featureFlags?.enabled) return false;

  try {
    // 1. 尝试从结果缓存获取
    const resultKey = `${FLAG_RESULT_PREFIX}${flagName}:user:${userId ?? 'anon'}`;
    const cached = await cache.get(resultKey);
    if (cached !== null) return cached;

    // 2. 获取 flag 配置（DB 优先，静态兜底）
    const flagConfig = await getEffectiveConfig(flagName);
    if (!flagConfig) return false;

    // 3. 评估
    const result = evaluateFlag(flagName, flagConfig, userId, userMeta);

    // 4. 写入结果缓存
    await cache.set(resultKey, result, config.featureFlags.cache.ttl);

    return result;
  } catch (err) {
    logger.error(`[featureFlags] 评估 ${flagName} 失败:`, err.message);
    return false;
  }
}

/**
 * 批量评估所有特性开关
 * @param {number|null} userId
 * @param {{ isAdmin?: boolean, role?: string }} [userMeta]
 * @returns {Promise<Object<string, boolean>>}
 */
async function getAllFeatureFlags(userId = null, userMeta = null) {
  if (!config.featureFlags?.enabled) return {};

  const cacheKey = `${FLAG_ALL_PREFIX}${userId ?? 'anon'}`;

  try {
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // 收集所有 flag 名称（静态 + DB）
    const allNames = new Set(Object.keys(staticFlags));
    try {
      const db = require('../db/index');
      const dbFlags = await db.featureFlag.findMany({ select: { name: true } });
      for (const f of dbFlags) allNames.add(f.name);
    } catch (_) { /* DB 不可用时仅用静态 */ }

    const results = {};
    for (const name of allNames) {
      results[name] = await getFeatureFlag(name, userId, userMeta);
    }

    await cache.set(cacheKey, results, config.featureFlags.cache.allTtl);
    return results;
  } catch (err) {
    logger.error(`[featureFlags] 批量评估失败:`, err.message);
    return {};
  }
}

/**
 * 失效指定 flag 的所有 Redis 缓存
 * @param {string} flagName
 */
async function invalidateFlagCache(flagName) {
  try {
    await Promise.all([
      cache.del(`${FLAG_CONFIG_PREFIX}${flagName}`),
      cache.delPattern(`${FLAG_RESULT_PREFIX}${flagName}:*`),
      cache.delPattern(`${FLAG_ALL_PREFIX}*`),
    ]);
    logger.info(`[featureFlags] 缓存已失效: ${flagName}`);
  } catch (err) {
    logger.error(`[featureFlags] 缓存失效失败:`, err.message);
  }
}

/**
 * 重新加载 flag 的 DB 配置到 Redis
 * @param {string} flagName
 * @returns {Promise<object|null>}
 */
async function reloadFlagConfig(flagName) {
  await cache.del(`${FLAG_CONFIG_PREFIX}${flagName}`);
  return getDbFlagConfig(flagName);
}

// ============== 内部函数 ==============

/**
 * 获取 flag 的有效配置（DB 优先）
 */
async function getEffectiveConfig(flagName) {
  const dbConfig = await getDbFlagConfig(flagName);
  if (dbConfig) return dbConfig;

  const staticConfig = staticFlags[flagName];
  if (staticConfig) {
    return {
      enabled: staticConfig.enabled,
      percentage: staticConfig.percentage ?? null,
      userIds: staticConfig.userIds ?? null,
      roles: Array.isArray(staticConfig.roles) ? staticConfig.roles.join(',') : (staticConfig.roles ?? null),
      startDate: staticConfig.startDate ?? null,
      endDate: staticConfig.endDate ?? null,
    };
  }
  return null;
}

/**
 * 从 DB 或 Redis 缓存获取 flag 配置
 */
async function getDbFlagConfig(flagName) {
  const configKey = `${FLAG_CONFIG_PREFIX}${flagName}`;
  try {
    const cached = await cache.get(configKey);
    if (cached) return cached;

    const db = require('../db/index');
    const record = await db.featureFlag.findUnique({ where: { name: flagName } });
    if (!record) return null;

    const configObj = {
      enabled: record.enabled,
      percentage: record.percentage,
      userIds: record.userIds,
      roles: record.roles,
      startDate: record.startDate ? record.startDate.toISOString() : null,
      endDate: record.endDate ? record.endDate.toISOString() : null,
    };

    await cache.set(configKey, configObj, config.featureFlags.cache.configTtl);
    return configObj;
  } catch (err) {
    return null;
  }
}

/**
 * 核心评估逻辑
 */
function evaluateFlag(flagName, flagConfig, userId, userMeta) {
  // 总开关关闭
  if (flagConfig.enabled === false) return false;

  const now = Date.now();

  // 时间范围检查
  if (flagConfig.startDate && now < new Date(flagConfig.startDate).getTime()) return false;
  if (flagConfig.endDate && now > new Date(flagConfig.endDate).getTime()) return false;

  // userIds 白名单
  if (flagConfig.userIds && Array.isArray(flagConfig.userIds) && flagConfig.userIds.length > 0) {
    const ids = flagConfig.userIds;
    // 特殊值 'admin' 匹配任意管理员
    if (ids.includes('admin') && userMeta?.isAdmin) return true;
    if (userId !== null && ids.includes(userId)) return true;
    return false;
  }

  // roles 白名单（逗号分隔）
  if (flagConfig.roles) {
    const allowedRoles = flagConfig.roles.split(',').map(r => r.trim());
    if (allowedRoles.length > 0) {
      if (!userMeta?.role) return false;
      if (!allowedRoles.includes(userMeta.role)) return false;
    }
  }

  // 百分比灰度（一致性哈希）
  if (flagConfig.percentage != null && flagConfig.percentage > 0 && flagConfig.percentage < 100) {
    if (userId == null) return false;
    return isInPercentageRollout(flagName, userId, flagConfig.percentage);
  }

  return true;
}

/**
 * 一致性哈希：SHA-256(flagName:userId) % 100 < percentage
 */
function isInPercentageRollout(flagName, userId, percentage) {
  if (percentage <= 0) return false;
  if (percentage >= 100) return true;
  const hash = crypto.createHash('sha256')
    .update(`${flagName}:${userId}`)
    .digest('hex');
  const bucket = parseInt(hash.substring(0, 8), 16) % 100;
  return bucket < percentage;
}

module.exports = {
  getFeatureFlag,
  getAllFeatureFlags,
  invalidateFlagCache,
  reloadFlagConfig,
};
