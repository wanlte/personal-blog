// routes/admin.js — 管理接口（定时任务控制）
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAllJobs, toggleJob, triggerJob } = require('../utils/scheduler');

// 管理员身份校验中间件
function requireAdmin(req, res, next) {
  // 简易管理员校验：user.isAdmin 或固定管理员 ID
  if (req.user && (req.user.isAdmin || req.user.userId === 1)) {
    return next();
  }
  res.status(403).json({ error: '需要管理员权限' });
}

router.use(authenticateToken, requireAdmin);

/**
 * @swagger
 * /api/admin/jobs:
 *   get:
 *     tags: [管理]
 *     summary: 获取所有定时任务状态
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 任务列表
 */
router.get('/jobs', (req, res) => {
  const jobs = getAllJobs();
  res.json({ success: true, data: jobs });
});

/**
 * @swagger
 * /api/admin/jobs:
 *   post:
 *     tags: [管理]
 *     summary: 启用/禁用定时任务
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, enabled]
 *             properties:
 *               name: { type: string }
 *               enabled: { type: boolean }
 *     responses:
 *       200:
 *         description: 操作成功
 */
router.post('/jobs', (req, res) => {
  const { name, enabled } = req.body;
  if (!name || enabled === undefined) {
    return res.status(400).json({ error: 'name 和 enabled 为必填项' });
  }
  const ok = toggleJob(name, enabled);
  if (!ok) return res.status(404).json({ error: `任务 ${name} 未注册` });
  res.json({ success: true, message: `任务 ${name} 已${enabled ? '启用' : '禁用'}` });
});

/**
 * @swagger
 * /api/admin/jobs/{name}/trigger:
 *   post:
 *     tags: [管理]
 *     summary: 手动触发定时任务
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 执行结果
 *       404:
 *         description: 任务未注册
 */
router.post('/jobs/:name/trigger', async (req, res, next) => {
  try {
    const result = await triggerJob(req.params.name);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('未注册')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
