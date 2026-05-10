// jobs/auditRetention.js - 审计日志保留清理任务
module.exports = {
  name: 'auditRetention',
  schedule: '0 2 * * *',
  timezone: 'Asia/Shanghai',

  async run() {
    const auditService = require('../utils/auditService');
    const config = require('../config');
    const retentionDays = config.audit?.retentionDays ?? 30;

    const deleted = await auditService.cleanupOldLogs(retentionDays);

    if (deleted > 0) {
      const logger = require('../utils/logger');
      logger.info(`[auditRetention] 清理 ${deleted} 条超过 ${retentionDays} 天的审计日志`);
    }

    return { deleted };
  },
};
