// controllers/auditController.js - 审计日志查询
const prisma = require('../db/index');

async function getAuditLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.resourceType) where.resourceType = req.query.resourceType;
    if (req.query.userId) where.userId = parseInt(req.query.userId);
    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};
      if (req.query.startDate) where.createdAt.gte = new Date(req.query.startDate);
      if (req.query.endDate) where.createdAt.lte = new Date(req.query.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: '获取审计日志失败' });
  }
}

async function getAuditLogStats(req, res) {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 86400000);

    const [total, recent] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: last24h } } }),
    ]);

    const topActions = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    });

    res.json({
      total,
      last24h: recent,
      topActions: topActions.map(a => ({ action: a.action, count: a._count.action })),
    });
  } catch (err) {
    res.status(500).json({ error: '获取审计统计失败' });
  }
}

module.exports = { getAuditLogs, getAuditLogStats };
