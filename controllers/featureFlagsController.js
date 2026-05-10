// controllers/featureFlagsController.js - 特性开关控制器
const config = require('../config');
const prisma = require('../db/index');
const staticFlags = require('../config/features');
const { invalidateFlagCache } = require('../utils/featureFlags');
const { success, error } = require('../utils/response');

/**
 * GET /api/features - 获取当前用户的所有开关
 */
async function getCurrentUserFlags(req, res) {
  return success(res, req.featureFlags, '获取特性开关成功');
}

/**
 * GET /api/admin/features - 管理员列出所有开关配置
 */
async function listFlags(req, res) {
  try {
    const dbFlags = await prisma.featureFlag.findMany({ orderBy: { name: 'asc' } });
    const dbFlagMap = {};
    for (const f of dbFlags) dbFlagMap[f.name] = f;

    // 合并静态 + DB
    const result = [];
    for (const name of Object.keys(staticFlags)) {
      const dbFlag = dbFlagMap[name];
      result.push(dbFlag
        ? { name, source: 'database', config: formatDbFlag(dbFlag) }
        : { name, source: 'static', config: staticFlags[name] }
      );
    }
    // DB 独有的 flag
    for (const dbFlag of dbFlags) {
      if (!staticFlags[dbFlag.name]) {
        result.push({ name: dbFlag.name, source: 'database', config: formatDbFlag(dbFlag) });
      }
    }

    return success(res, result, '获取特性开关列表成功');
  } catch (err) {
    return error(res, '获取特性开关列表失败', 500);
  }
}

/**
 * PUT /api/admin/features/:name - 创建或更新开关配置
 */
async function updateFlag(req, res) {
  try {
    const { name: flagName } = req.params;
    const { enabled, percentage, userIds, roles, startDate, endDate } = req.body;

    const oldFlag = await prisma.featureFlag.findUnique({ where: { name: flagName } });

    const flag = await prisma.featureFlag.upsert({
      where: { name: flagName },
      update: {
        ...(enabled !== undefined && { enabled }),
        ...(percentage !== undefined && { percentage }),
        ...(userIds !== undefined && { userIds }),
        ...(roles !== undefined && { roles }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        updatedBy: req.user.userId,
      },
      create: {
        name: flagName,
        enabled: enabled !== undefined ? enabled : false,
        percentage: percentage || 0,
        userIds: userIds || [],
        roles: roles || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        updatedBy: req.user.userId,
      },
    });

    await invalidateFlagCache(flagName);

    // 管理员操作日志
    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: oldFlag ? 'update_feature_flag' : 'create_feature_flag',
        target: `feature_flag:${flagName}`,
        details: JSON.stringify({ enabled, percentage, userIds, roles, startDate, endDate }),
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    // 审计日志
    req.audit?.log({
      action: oldFlag ? 'FEATURE_FLAG_UPDATE' : 'FEATURE_FLAG_CREATE',
      resourceType: 'feature_flag',
      resourceId: flagName,
      oldValue: oldFlag ? formatDbFlag(oldFlag) : null,
      newValue: formatDbFlag(flag),
    });

    return success(res, formatDbFlag(flag), oldFlag ? '更新成功' : '创建成功');
  } catch (err) {
    if (err.code === 'P2025') return error(res, '特性开关不存在', 404);
    return error(res, '更新特性开关失败', 500);
  }
}

/**
 * DELETE /api/admin/features/:name - 删除 DB 覆盖，恢复静态默认
 */
async function deleteFlag(req, res) {
  try {
    const { name: flagName } = req.params;

    const oldFlag = await prisma.featureFlag.findUnique({ where: { name: flagName } });
    if (!oldFlag) return error(res, '特性开关不存在', 404);

    await prisma.featureFlag.delete({ where: { name: flagName } });
    await invalidateFlagCache(flagName);

    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: 'delete_feature_flag',
        target: `feature_flag:${flagName}`,
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    req.audit?.log({
      action: 'FEATURE_FLAG_DELETE',
      resourceType: 'feature_flag',
      resourceId: flagName,
      oldValue: formatDbFlag(oldFlag),
    });

    return success(res, null, '特性开关已删除，将使用静态默认配置');
  } catch (err) {
    if (err.code === 'P2025') return error(res, '特性开关不存在', 404);
    return error(res, '删除特性开关失败', 500);
  }
}

function formatDbFlag(flag) {
  return {
    enabled: flag.enabled,
    percentage: flag.percentage,
    userIds: flag.userIds,
    roles: flag.roles ? flag.roles.split(',').map(r => r.trim()) : [],
    startDate: flag.startDate ? flag.startDate.toISOString() : null,
    endDate: flag.endDate ? flag.endDate.toISOString() : null,
    updatedBy: flag.updatedBy,
    updatedAt: flag.updatedAt,
  };
}

module.exports = {
  getCurrentUserFlags,
  listFlags,
  updateFlag,
  deleteFlag,
};
