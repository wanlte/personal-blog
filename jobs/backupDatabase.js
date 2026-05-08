// jobs/backupDatabase.js — 数据库备份
// 每天凌晨 3:00 执行，使用 pg_dump 导出备份文件

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const KEEP_DAYS = parseInt(process.env.BACKUP_KEEP_DAYS || '7', 10);

module.exports = {
  name: 'backupDatabase',
  schedule: '0 3 * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return { skipped: true, reason: 'DATABASE_URL 未设置' };

    // 确保备份目录存在
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    return new Promise((resolve, reject) => {
      exec(`pg_dump "${dbUrl}" > "${filepath}"`, (err) => {
        if (err) return reject(err);

        const stat = fs.statSync(filepath);

        // 清理超过保留天数的备份
        const files = fs.readdirSync(BACKUP_DIR)
          .filter((f) => f.startsWith('backup_') && f.endsWith('.sql'))
          .sort();
        const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
        let deleted = 0;
        for (const f of files) {
          const fp = path.join(BACKUP_DIR, f);
          if (fs.statSync(fp).mtimeMs < cutoff) {
            fs.unlinkSync(fp);
            deleted++;
          }
        }

        resolve({
          file: filename,
          size: stat.size,
          deletedOldBackups: deleted,
        });
      });
    });
  },
};
