// middleware/adminAuth.js - 管理员权限中间件（基于角色）
const { authenticateToken } = require('./auth');

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  CONTENT_ADMIN: 'content_admin',
  ANALYST: 'analyst',
};

const ROLE_HIERARCHY = {
  super_admin: ['super_admin', 'content_admin', 'analyst'],
  content_admin: ['content_admin', 'analyst'],
  analyst: ['analyst'],
};

// 管理员认证中间件：必须登录 + isAdmin 标记
function requireAdmin(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: '需要管理员权限' });
    return;
  }
  next();
}

// 基于角色的权限控制
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
      res.status(403).json({ error: '需要管理员权限' });
      return;
    }

    const userRole = req.user.role || 'analyst';
    const allowed = allowedRoles.some(
      (r) => ROLE_HIERARCHY[userRole]?.includes(r)
    );

    if (!allowed) {
      res.status(403).json({ error: `需要 ${allowedRoles.join(' 或 ')} 权限` });
      return;
    }

    next();
  };
}

// 超级管理员快捷中间件
const requireSuperAdmin = requireRole(ROLES.SUPER_ADMIN);

// 内容管理快捷中间件
const requireContentAdmin = requireRole(ROLES.SUPER_ADMIN, ROLES.CONTENT_ADMIN);

// 将 authenticateToken + requireAdmin 组合
const adminAuth = [authenticateToken, requireAdmin];

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  requireAdmin,
  requireRole,
  requireSuperAdmin,
  requireContentAdmin,
  adminAuth,
};
