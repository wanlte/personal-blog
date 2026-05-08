// jobs/subscriptionChecker.js — 订阅过期检查
// 每小时检查一次，将过期订阅标记为 expired

const prisma = require('../db/index');

module.exports = {
  name: 'subscriptionChecker',
  schedule: '0 * * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    const now = new Date();

    // 查找已过期但仍为 active 的订阅
    const expired = await prisma.userSubscription.findMany({
      where: {
        status: 'active',
        endDate: { lt: now },
      },
      select: { id: true, userId: true, plan: { select: { name: true } } },
    });

    if (expired.length === 0) return { expired: 0 };

    // 批量标记为过期
    const ids = expired.map((s) => s.id);
    await prisma.userSubscription.updateMany({
      where: { id: { in: ids } },
      data: { status: 'expired' },
    });

    return { expired: expired.length, details: expired.map((s) => ({ userId: s.userId, plan: s.plan.name })) };
  },
};
