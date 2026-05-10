// routes/admin.js — 管理后台 API（定时任务 + 内容/用户/评论/配置管理）
const express = require('express');
const router = express.Router();
const { adminAuth, requireSuperAdmin, requireContentAdmin, ROLES } = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminController');
const featureCtrl = require('../controllers/featureFlagsController');
const { getAllJobs, toggleJob, triggerJob } = require('../utils/scheduler');

// ============ 公开路由（无需认证） ============

// POST /api/admin/login - 管理员登录
router.post('/login', ctrl.login);

// ============ 需管理员认证的路由 ============

// GET /api/admin/me - 当前管理员信息
router.get('/me', adminAuth, ctrl.me);

// ============ 仪表盘（所有管理员角色） ============

// GET /api/admin/stats - 仪表盘统计数据
// GET /api/admin/stats/trends - 30 天趋势
router.get('/stats', adminAuth, ctrl.getStats);
router.get('/stats/trends', adminAuth, ctrl.getTrends);

// ============ 文章管理（超级管理员 + 内容管理员） ============

// GET    /api/admin/articles        - 文章列表（分页 + 搜索 + 状态筛选）
// PUT    /api/admin/articles/:id    - 更新文章（审核/下架/置顶）
// DELETE /api/admin/articles/:id    - 删除文章
router.get('/articles', adminAuth, requireContentAdmin, ctrl.getArticles);
router.put('/articles/:id', adminAuth, requireContentAdmin, ctrl.updateArticle);
router.delete('/articles/:id', adminAuth, requireContentAdmin, ctrl.deleteArticle);

// ============ 用户管理（仅超级管理员） ============

// GET    /api/admin/users          - 用户列表（分页 + 搜索）
// PUT    /api/admin/users/:id      - 更新用户（管理员权限/角色）
// DELETE /api/admin/users/:id      - 删除用户
// POST   /api/admin/users          - 创建管理员账号
router.get('/users', adminAuth, requireSuperAdmin, ctrl.getUsers);
router.put('/users/:id', adminAuth, requireSuperAdmin, ctrl.updateUser);
router.delete('/users/:id', adminAuth, requireSuperAdmin, ctrl.deleteUser);
router.post('/users', adminAuth, requireSuperAdmin, ctrl.createAdmin);

// ============ 评论管理（超级管理员 + 内容管理员） ============

// GET    /api/admin/comments       - 评论列表（分页）
// DELETE /api/admin/comments/:id   - 删除评论
router.get('/comments', adminAuth, requireContentAdmin, ctrl.getComments);
router.delete('/comments/:id', adminAuth, requireContentAdmin, ctrl.deleteComment);

// ============ 系统配置（仅超级管理员） ============

// GET /api/admin/settings     - 获取所有设置
// PUT /api/admin/settings     - 批量更新设置
router.get('/settings', adminAuth, requireSuperAdmin, ctrl.getSettings);
router.put('/settings', adminAuth, requireSuperAdmin, ctrl.updateSettings);

// ============ 操作日志（仅超级管理员） ============

// GET /api/admin/logs - 操作日志列表（分页）
router.get('/logs', adminAuth, requireSuperAdmin, ctrl.getLogs);

// ============ 定时任务管理（超级管理员 + 内容管理员） ============

// GET  /api/admin/jobs              - 获取所有定时任务
// POST /api/admin/jobs              - 启用/禁用定时任务
// POST /api/admin/jobs/:name/trigger - 手动触发
router.get('/jobs', adminAuth, ctrl.getStats); // 保留兼容，通过 getStats 主仪表盘获取
router.get('/scheduler/jobs', adminAuth, (req, res) => {
  res.json({ success: true, data: getAllJobs() });
});
router.post('/scheduler/jobs', adminAuth, (req, res) => {
  const { name, enabled } = req.body;
  if (!name || enabled === undefined) {
    return res.status(400).json({ error: 'name 和 enabled 为必填项' });
  }
  const ok = toggleJob(name, enabled);
  if (!ok) return res.status(404).json({ error: `任务 ${name} 未注册` });
  res.json({ success: true, message: `任务 ${name} 已${enabled ? '启用' : '禁用'}` });
});
router.post('/scheduler/jobs/:name/trigger', adminAuth, async (req, res, next) => {
  try {
    const result = await triggerJob(req.params.name);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('未注册')) return res.status(404).json({ error: err.message });
    next(err);
  }
});

// ============ 特性开关管理（超级管理员 + 内容管理员） ============

// GET    /api/admin/features           - 列出所有特性开关配置
// PUT    /api/admin/features/:name     - 创建/更新特性开关配置
// DELETE /api/admin/features/:name     - 删除特性开关配置（回退到静态默认）
router.get('/features', adminAuth, requireContentAdmin, featureCtrl.listFlags);
router.put('/features/:name', adminAuth, requireContentAdmin, featureCtrl.updateFlag);
router.delete('/features/:name', adminAuth, requireContentAdmin, featureCtrl.deleteFlag);

// ============ 备份恢复管理（仅超级管理员） ============

// POST /api/admin/backup/trigger       - 手动触发备份（body: { type: 'full'|'incremental' }）
// GET  /api/admin/backup/list          - 列出可用备份
// POST /api/admin/backup/restore       - 恢复备份（body: { file: 'backup_name' }）
router.post('/backup/trigger', adminAuth, requireSuperAdmin, async (req, res, next) => {
  try {
    const { type = 'full' } = req.body;
    const { fullBackup, incrementalBackup } = require('../../scripts/backup/backup');
    const fn = type === 'incremental' ? incrementalBackup : fullBackup;
    const result = await fn({ encrypt: true, upload: true });
    req.audit?.log({ action: 'BACKUP_TRIGGER', resourceType: 'backup', resourceId: result.file });
    res.json({ success: true, data: result, message: `${type === 'incremental' ? '增量' : '全量'}备份完成` });
  } catch (err) {
    next(err);
  }
});

router.get('/backup/list', adminAuth, requireSuperAdmin, async (req, res, next) => {
  try {
    const { listBackups } = require('../../scripts/backup/restore');
    const backups = await listBackups();
    res.json({ success: true, data: backups });
  } catch (err) {
    next(err);
  }
});

router.post('/backup/restore', adminAuth, requireSuperAdmin, async (req, res, next) => {
  try {
    const { file: backupFile } = req.body;
    if (!backupFile) return res.status(400).json({ error: '缺少 backupFile 参数' });
    const { restoreBackup } = require('../../scripts/backup/restore');
    const result = await restoreBackup(backupFile);
    req.audit?.log({ action: 'BACKUP_RESTORE', resourceType: 'backup', resourceId: backupFile });
    res.json({ success: true, data: result, message: '恢复完成' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
