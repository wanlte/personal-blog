// middleware/featureFlags.js - 特性开关 Express 中间件
const { getAllFeatureFlags, getFeatureFlag } = require('../utils/featureFlags');
const { asyncHandler } = require('./errorHandler');

/**
 * 创建特性开关中间件，自动注入 req.featureFlags
 * @param {string[]} [requestedFlags] - 可选，仅评估指定 flag
 * @returns {Function} Express 中间件
 */
function featureFlags(requestedFlags = null) {
  return asyncHandler(async (req, res, next) => {
    const userId = req.user?.userId || null;
    const userMeta = req.user ? { isAdmin: req.user.isAdmin, role: req.user.role } : null;

    if (requestedFlags && requestedFlags.length > 0) {
      const results = {};
      for (const name of requestedFlags) {
        results[name] = await getFeatureFlag(name, userId, userMeta);
      }
      req.featureFlags = results;
    } else {
      req.featureFlags = await getAllFeatureFlags(userId, userMeta);
    }

    next();
  });
}

module.exports = { featureFlags };
