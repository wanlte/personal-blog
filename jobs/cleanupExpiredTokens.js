// jobs/cleanupExpiredTokens.js — 清理过期数据
// 每天凌晨 1:00 执行，清理过期的订阅、支付记录、旧日志等

const config = require('../config');
const prisma = require('../db/index');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'cleanupExpiredTokens',
  schedule: '0 1 * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    const results = {};

    // 1. 清理 90 天前已过期/已取消的订阅记录
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const oldSubs = await prisma.userSubscription.deleteMany({
      where: {
        status: { in: ['expired', 'cancelled'] },
        endDate: { lt: cutoff90 },
      },
    });
    results.oldSubscriptions = oldSubs.count;

    // 2. 清理 30 天前的 pending 支付记录
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pendingPayments = await prisma.paymentRecord.deleteMany({
      where: {
        status: 'pending',
        createdAt: { lt: cutoff30 },
      },
    });
    results.pendingPayments = pendingPayments.count;

    // 3. 清理旧的备份文件 (超过 30 天)
    const backupDir = config.backup.dir || path.join(__dirname, '..', 'backups');
    let deletedBackups = 0;
    if (fs.existsSync(backupDir)) {
      const cutoffFiles = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(backupDir).filter((f) => f.startsWith('backup_'));
      for (const f of files) {
        const fp = path.join(backupDir, f);
        if (fs.statSync(fp).mtimeMs < cutoffFiles) {
          fs.unlinkSync(fp);
          deletedBackups++;
        }
      }
    }
    results.deletedOldBackups = deletedBackups;

    return results;
  },
};
