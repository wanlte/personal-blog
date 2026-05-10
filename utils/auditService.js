// utils/auditService.js - 审计日志写入服务
const prisma = require('../db/index');
const logger = require('./logger');

const PERMANENT_ACTIONS = new Set([
  'USER_LOGIN', 'USER_REGISTER',
  'PAYMENT_CREATE', 'PAYMENT_REFUND',
  'ADMIN_USER_UPDATE', 'ADMIN_CREATE', 'SETTINGS_UPDATE',
]);

async function log(entry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? undefined,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId != null ? String(entry.resourceId) : undefined,
        ipAddress: entry.ipAddress || undefined,
        userAgent: entry.userAgent || undefined,
        oldValue: entry.oldValue || undefined,
        newValue: entry.newValue || undefined,
        metadata: entry.metadata || undefined,
        duration: entry.duration ?? undefined,
      },
    });
  } catch (err) {
    logger.error(`[audit] 写入失败: ${err.message}`, { action: entry.action });
  }
}

async function batchLog(entries) {
  if (!entries.length) return;
  try {
    await prisma.auditLog.createMany({
      data: entries.map(e => ({
        userId: e.userId ?? undefined,
        action: e.action,
        resourceType: e.resourceType,
        resourceId: e.resourceId != null ? String(e.resourceId) : undefined,
        ipAddress: e.ipAddress || undefined,
        userAgent: e.userAgent || undefined,
        oldValue: e.oldValue || undefined,
        newValue: e.newValue || undefined,
        metadata: e.metadata || undefined,
        duration: e.duration ?? undefined,
      })),
    });
  } catch (err) {
    logger.error(`[audit] 批量写入失败: ${err.message}`);
  }
}

async function cleanupOldLogs(retentionDays) {
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        action: { notIn: [...PERMANENT_ACTIONS] },
      },
    });
    return result.count;
  } catch (err) {
    logger.error(`[audit] 清理失败: ${err.message}`);
    return 0;
  }
}

module.exports = { log, batchLog, cleanupOldLogs, PERMANENT_ACTIONS };
