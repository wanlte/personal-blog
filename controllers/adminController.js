// controllers/adminController.js - 管理后台业务逻辑
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/index');
const config = require('../config');
const { emitToAdmin } = require('../utils/websocket');

// ============ 登录 ============

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.password) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: '该账号不是管理员' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        isAdmin: true,
        role: user.role || 'analyst',
      },
      config.jwt.secret,
      { expiresIn: '8h' }
    );

    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        action: 'login',
        target: `user:${user.id}`,
        details: '管理员登录',
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role || 'analyst',
      },
    });

    req.audit?.log({
      userId: user.id,
      action: 'ADMIN_LOGIN',
      resourceType: 'user',
      resourceId: user.id,
      newValue: { username: user.username, role: user.role || 'analyst' },
    });
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
}

// ============ 当前管理员信息 ============

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, username: true, email: true, avatar: true, isAdmin: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
}

// ============ 仪表盘统计 ============

async function getStats(req, res) {
  try {
    const [
      totalArticles, publishedArticles, draftArticles,
      totalUsers, adminUsers,
      totalComments, pendingComments,
      totalViews,
      recentArticles, recentUsers, recentComments,
    ] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: 'published' } }),
      prisma.article.count({ where: { status: 'draft' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.comment.count(),
      prisma.comment.count({ where: { status: 'pending' } }),
      prisma.article.aggregate({ _sum: { views: true } }),
      prisma.article.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, status: true, views: true, createdAt: true } }),
      prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, username: true, email: true, isAdmin: true, createdAt: true } }),
      prisma.comment.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, content: true, userName: true, createdAt: true } }),
    ]);

    res.json({
      counts: {
        articles: totalArticles,
        published: publishedArticles,
        drafts: draftArticles,
        users: totalUsers,
        admins: adminUsers,
        comments: totalComments,
        pendingComments,
        totalViews: totalViews._sum.views || 0,
      },
      recentArticles,
      recentUsers,
      recentComments,
    });
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
}

// ============ 每日趋势数据（最近 30 天） ============

async function getTrends(req, res) {
  try {
    const days = 30;
    const results = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const [articles, users, comments] = await Promise.all([
        prisma.article.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.user.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
        prisma.comment.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
      ]);

      results.push({
        date: dayStart.toISOString().slice(0, 10),
        articles, users, comments,
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: '获取趋势数据失败' });
  }
}

// ============ 文章管理 ============

async function getArticles(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || '';
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (search) where.title = { contains: search };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true } },
          _count: { select: { comments: true, likes: true } },
        },
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      data: articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: '获取文章列表失败' });
  }
}

async function updateArticle(req, res) {
  try {
    const { id } = req.params;
    const { status, isPinned } = req.body;

    const oldArticle = await prisma.article.findUnique({ where: { id: parseInt(id) } });
    if (!oldArticle) return res.status(404).json({ error: '文章不存在' });

    const article = await prisma.article.update({
      where: { id: parseInt(id) },
      data: {
        ...(status !== undefined && { status }),
        ...(isPinned !== undefined && { isPinned: isPinned ? 1 : 0 }),
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: 'update_article',
        target: `article:${id}`,
        details: JSON.stringify({ status, isPinned }),
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    res.json(article);
    emitToAdmin('stats:update');

    req.audit?.log({
      action: 'ADMIN_ARTICLE_UPDATE',
      resourceType: 'article',
      resourceId: parseInt(id),
      oldValue: { status: oldArticle.status, isPinned: oldArticle.isPinned },
      newValue: { status: status ?? oldArticle.status, isPinned: isPinned !== undefined ? (isPinned ? 1 : 0) : oldArticle.isPinned },
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: '文章不存在' });
    res.status(500).json({ error: '更新文章失败' });
  }
}

async function deleteArticle(req, res) {
  try {
    const { id } = req.params;
    const article = await prisma.article.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, title: true, status: true },
    });
    if (!article) return res.status(404).json({ error: '文章不存在' });

    await prisma.article.delete({ where: { id: parseInt(id) } });

    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: 'delete_article',
        target: `article:${id}`,
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    res.json({ success: true });
    emitToAdmin('stats:update');

    req.audit?.log({
      action: 'ADMIN_ARTICLE_DELETE',
      resourceType: 'article',
      resourceId: parseInt(id),
      oldValue: { title: article.title, status: article.status },
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: '文章不存在' });
    res.status(500).json({ error: '删除文章失败' });
  }
}

// ============ 用户管理 ============

async function getUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, email: true, avatar: true,
          isAdmin: true, role: true, createdAt: true,
          _count: { select: { articles: true, comments: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { isAdmin, role } = req.body;

    // 仅超级管理员可以提升/降级管理员
    if (req.user.role !== 'super_admin' && (isAdmin !== undefined || role === 'super_admin')) {
      return res.status(403).json({ error: '仅超级管理员可以修改管理员权限' });
    }

    const oldUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, username: true, email: true, isAdmin: true, role: true },
    });
    if (!oldUser) return res.status(404).json({ error: '用户不存在' });

    const data = {};
    if (isAdmin !== undefined) data.isAdmin = isAdmin;
    if (role !== undefined) data.role = role;

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, username: true, email: true, isAdmin: true, role: true },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: isAdmin ? 'promote_admin' : 'update_user',
        target: `user:${id}`,
        details: JSON.stringify({ isAdmin, role }),
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    res.json(user);
    emitToAdmin('stats:update');

    req.audit?.log({
      action: 'ADMIN_USER_UPDATE',
      resourceType: 'user',
      resourceId: parseInt(id),
      oldValue: { isAdmin: oldUser.isAdmin, role: oldUser.role },
      newValue: { isAdmin: isAdmin ?? oldUser.isAdmin, role: role ?? oldUser.role },
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: '用户不存在' });
    res.status(500).json({ error: '更新用户失败' });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (req.user.userId === userId) {
      return res.status(400).json({ error: '不能删除自己的账号' });
    }

    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, isAdmin: true, role: true },
    });
    if (!oldUser) return res.status(404).json({ error: '用户不存在' });

    await prisma.user.delete({ where: { id: userId } });

    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: 'delete_user',
        target: `user:${id}`,
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    res.json({ success: true });
    emitToAdmin('stats:update');

    req.audit?.log({
      action: 'ADMIN_USER_DELETE',
      resourceType: 'user',
      resourceId: userId,
      oldValue: { username: oldUser.username, email: oldUser.email, isAdmin: oldUser.isAdmin, role: oldUser.role },
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: '用户不存在' });
    res.status(500).json({ error: '删除用户失败' });
  }
}

// ============ 评论管理 ============

async function getComments(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true } },
          article: { select: { id: true, title: true } },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    res.json({
      data: comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: '获取评论列表失败' });
  }
}

async function deleteComment(req, res) {
  try {
    const { id } = req.params;
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, content: true, articleId: true },
    });
    if (!comment) return res.status(404).json({ error: '评论不存在' });

    await prisma.comment.delete({ where: { id: parseInt(id) } });

    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: 'delete_comment',
        target: `comment:${id}`,
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    res.json({ success: true });
    emitToAdmin('stats:update');

    req.audit?.log({
      action: 'ADMIN_COMMENT_DELETE',
      resourceType: 'comment',
      resourceId: parseInt(id),
      oldValue: { content: comment.content, articleId: comment.articleId },
    });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: '评论不存在' });
    res.status(500).json({ error: '删除评论失败' });
  }
}

// ============ 系统配置 ============

async function getSettings(req, res) {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: '获取配置失败' });
  }
}

async function updateSettings(req, res) {
  try {
    const updates = req.body;

    // 捕获变更前的值
    const oldSettings = await prisma.systemSetting.findMany({
      where: { key: { in: Object.keys(updates) } },
      select: { key: true, value: true },
    });
    const oldValueMap = {};
    for (const s of oldSettings) oldValueMap[s.key] = s.value;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: 'update_settings',
        details: JSON.stringify(Object.keys(updates)),
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    res.json({ success: true });

    req.audit?.log({
      action: 'SETTINGS_UPDATE',
      resourceType: 'settings',
      resourceId: 'global',
      oldValue: oldValueMap,
      newValue: updates,
    });
  } catch (err) {
    res.status(500).json({ error: '更新配置失败' });
  }
}

// ============ 操作日志 ============

async function getLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, username: true } },
        },
      }),
      prisma.adminLog.count(),
    ]);

    res.json({
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: '获取操作日志失败' });
  }
}

// ============ 创建管理员账号 ============

async function createAdmin(req, res) {
  try {
    const { username, password, email, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        isAdmin: true,
        role: role || 'content_admin',
      },
      select: { id: true, username: true, email: true, isAdmin: true, role: true, createdAt: true },
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user.userId,
        action: 'create_admin',
        target: `user:${user.id}`,
        details: JSON.stringify({ username, role }),
        ip: req.ip || req.socket?.remoteAddress,
      },
    });

    res.status(201).json(user);

    req.audit?.log({
      action: 'ADMIN_CREATE',
      resourceType: 'user',
      resourceId: user.id,
      newValue: { username, role: role || 'content_admin' },
    });
  } catch (err) {
    res.status(500).json({ error: '创建管理员失败' });
  }
}

module.exports = {
  login, me,
  getStats, getTrends,
  getArticles, updateArticle, deleteArticle,
  getUsers, updateUser, deleteUser,
  getComments, deleteComment,
  getSettings, updateSettings,
  getLogs,
  createAdmin,
};
