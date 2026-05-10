// middleware/auditLogger.js - 审计日志中间件
const config = require('../config');

function auditLogger(req, res, next) {
  if (!config.audit?.enabled) return next();

  const start = Date.now();
  const ip = req.ip || req.socket?.remoteAddress;
  const userAgent = req.get('user-agent') || null;
  const entries = [];

  req.audit = {
    log(opts) {
      entries.push({
        userId: opts.userId !== undefined ? opts.userId : (req.user?.userId || null),
        action: opts.action,
        resourceType: opts.resourceType,
        resourceId: opts.resourceId,
        ipAddress: ip || undefined,
        userAgent: userAgent || undefined,
        oldValue: opts.oldValue || undefined,
        newValue: opts.newValue || undefined,
        metadata: opts.metadata || undefined,
      });
    },
  };

  res.on('finish', () => {
    if (entries.length === 0) return;
    const duration = Date.now() - start;
    const auditService = require('../utils/auditService');
    if (entries.length === 1) {
      auditService.log({ ...entries[0], duration }).catch(() => {});
    } else {
      auditService.batchLog(entries.map(e => ({ ...e, duration }))).catch(() => {});
    }
  });

  next();
}

module.exports = auditLogger;
