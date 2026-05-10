// jobs/backupDatabase.js - 数据库备份任务（全量 + 增量）
// 每天凌晨 3:00 全量备份，每 6 小时增量备份
const { fullBackup, incrementalBackup } = require('../scripts/backup/backup');
const { sendEmail } = require('../utils/email');
const config = require('../config');
const logger = require('../utils/logger');

const NOTIFY_EMAIL = config.backup.notificationEmail || config.mail.user || '';

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
  } catch (_) { /* ignore */ }
}

module.exports = {
  name: 'backupDatabase',
  schedule: '0 3 * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    const result = await fullBackup();
    await notify('全量备份完成', `文件: ${result.file}\n大小: ${formatSize(result.size)}\nSHA256: ${result.checksum}\n耗时: ${result.duration}\n清理: ${result.deleted} 个`);
    return result;
  },

  async onError(err) {
    logger.error(`[backupDatabase] 全量备份失败: ${err.message}`);
    await notify('全量备份失败', `错误: ${err.message}\n时间: ${new Date().toISOString()}`, true);
  },
};
