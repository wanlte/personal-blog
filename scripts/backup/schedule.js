// scripts/backup/schedule.js - 备份定时任务 + 监控告警
// 注册到 scheduler: scheduler.register(require('./scripts/backup/schedule').fullBackupJob)
//                     scheduler.register(require('./scripts/backup/schedule').incrementalBackupJob)
//                     scheduler.register(require('./scripts/backup/schedule').spaceMonitorJob)

const os = require('os');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const logger = require('../../utils/logger');
const { sendEmail } = require('../../utils/email');
const { fullBackup, incrementalBackup } = require('./backup');

const NOTIFY_EMAIL = config.backup.notificationEmail || config.mail.user || '';
const ALERT_GB = config.backup.storageSpaceAlertGB || 5;
const BACKUP_DIR = config.backup.dir || path.join(__dirname, '..', '..', 'backups');

// ============== 任务定义（兼容 utils/scheduler.register） ==============

/** 全量备份 — 每天凌晨 3:00 */
const fullBackupJob = {
  name: 'fullBackup',
  schedule: '0 3 * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    const result = await fullBackup();
    await notify('全量备份完成', `备份文件: ${result.file}\n大小: ${formatSize(result.size)}\nSHA256: ${result.checksum}\n耗时: ${result.duration}\n清理旧备份: ${result.deleted} 个`);
    return result;
  },

  async onError(err) {
    await notify('全量备份失败', `错误: ${err.message}\n时间: ${new Date().toISOString()}`, true);
    logger.error(`[备份定时] 全量备份失败: ${err.message}`);
  },
};

/** 增量备份 — 每 6 小时 */
const incrementalBackupJob = {
  name: 'incrementalBackup',
  schedule: '0 */6 * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    const result = await incrementalBackup();
    return result;
  },

  async onError(err) {
    // 增量备份失败仅告警，不发送邮件（每6小时太多）
    logger.error(`[备份定时] 增量备份失败: ${err.message}`);
  },
};

/** 磁盘空间监控 — 每 30 分钟检查一次 */
const spaceMonitorJob = {
  name: 'backupSpaceMonitor',
  schedule: '*/30 * * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    // 检查备份目录所在磁盘空间
    let checkDir = BACKUP_DIR;
    if (!fs.existsSync(checkDir)) checkDir = os.tmpdir();

    const freeBytes = getFreeSpace(checkDir);
    const freeGB = freeBytes / (1024 * 1024 * 1024);

    if (freeGB < ALERT_GB) {
      const msg = `备份磁盘空间不足\n可用空间: ${freeGB.toFixed(1)} GB\n告警阈值: ${ALERT_GB} GB\n目录: ${checkDir}`;
      logger.warn(`[备份监控] ${msg}`);
      await notify('磁盘空间告警', msg, true);
      return { alert: true, freeGB: freeGB.toFixed(1) };
    }

    return { freeGB: freeGB.toFixed(1) };
  },

  async onError(err) {
    logger.error(`[备份监控] 空间检查失败: ${err.message}`);
  },
};

// ============== 助手函数 ==============

function getFreeSpace(dir) {
  try {
    // 跨平台：Windows 下用 wmic，Unix 下用 df
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      // 获取驱动器号
      const drive = path.parse(path.resolve(dir)).root;
      const out = execSync(`wmic logicaldisk where "DeviceID='${drive.replace(/\\/g, '')}'" get FreeSpace`, { timeout: 5000 }).toString();
      const match = out.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }
    const stat = fs.statfsSync(dir);
    return stat.bfree * stat.bsize;
  } catch (_) {
    return Infinity;
  }
}

async function notify(subject, body, isWarning = false) {
  if (!NOTIFY_EMAIL) return;
  try {
    await sendEmail({
      to: NOTIFY_EMAIL,
      subject: `[${isWarning ? '告警' : '通知'}] ${config.server.siteName} - ${subject}`,
      html: `
<div style="font-family: monospace; background: ${isWarning ? '#fff3cd' : '#f0fff0'}; padding: 16px; border-radius: 8px;">
  <h3 style="margin-top: 0; color: ${isWarning ? '#856404' : '#155724'};">${subject}</h3>
  <pre style="white-space: pre-wrap; font-size: 13px; color: #333;">${body}</pre>
  <hr>
  <p style="font-size: 11px; color: #999;">时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
</div>`,
    });
  } catch (_) { /* 告警邮件发送失败不影响主流程 */ }
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

module.exports = {
  fullBackupJob,
  incrementalBackupJob,
  spaceMonitorJob,
};
