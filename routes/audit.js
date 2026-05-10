// routes/audit.js - 审计日志查询接口
const express = require('express');
const router = express.Router();
const { adminAuth, requireSuperAdmin } = require('../middleware/adminAuth');
const { getAuditLogs, getAuditLogStats } = require('../controllers/auditController');

// GET /api/audit/logs - 分页查询审计日志
router.get('/logs', adminAuth, requireSuperAdmin, getAuditLogs);

// GET /api/audit/logs/stats - 审计统计摘要
router.get('/logs/stats', adminAuth, requireSuperAdmin, getAuditLogStats);

module.exports = router;
