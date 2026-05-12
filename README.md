# 个人博客系统

一个功能完整的全栈个人博客系统，具备内容创作、社交互动、创作者变现能力，以及完整的企业级 DevOps 基础设施。

[![CI/CD Deploy](https://github.com/wanlte/personal-blog/actions/workflows/deploy.yml/badge.svg)](https://github.com/wanlte/personal-blog/actions/workflows/deploy.yml)
[![Coverage](https://github.com/wanlte/personal-blog/actions/workflows/coverage.yml/badge.svg)](https://github.com/wanlte/personal-blog/actions/workflows/coverage.yml)

---

## 一、功能特性

### 内容创作
- **Markdown 编辑器** — 集成 EasyMDE，支持实时预览和图片上传
- **文章管理** — 发布/草稿/付费三种状态，支持编辑和删除
- **文章置顶** — 将重要文章固定在首页顶部
- **标签系统** — 支持多标签分类和按标签筛选
- **图片上传** — 支持 jpeg/png/gif/webp，5MB 限制

### 社交互动
- **评论系统** — 支持嵌套回复（游客或登录用户均可评论）
- **点赞收藏** — 为文章点赞、收藏到个人夹
- **关注机制** — 关注/取关其他创作者，查看粉丝列表
- **热门作者** — 按关注量排行

### 创作者变现
- **付费文章** — 设置文章价格，用户购买后阅读全文
- **订阅方案** — 月度/年度会员，自定义权益
- **创作者中心** — 收入概览、粉丝统计、文章管理
- **收益明细** — 购买记录与支付历史查询

### 安全防护
- **Helmet 安全头** — CSP、XSS、点击劫持防护
- **CORS 跨域配置** — 环境感知的域名白名单
- **频率限制** — 全局/登录/注册三级限流，Redis 存储
- **输入验证** — express-validator 覆盖所有接口
- **JWT 认证** — 配合 bcrypt 密码哈希
- **敏感数据加密** — AES-256 加密 API 密钥、身份证、银行卡
- **操作审计** — 记录所有 CRUD 操作的新旧值差异
- **角色权限** — super_admin / content_admin / analyst 三级 RBAC

### 可观测性
- **Winston 日志** — 结构化日志 + 请求追踪 ID
- **Prometheus 监控** — 暴露指标采集端点
- **健康检查** — 数据库连接状态检查（`/api/health/db`）
- **请求日志** — 中间件记录所有请求详情

### DevOps 基础设施
- **Docker 多服务编排** — app + PostgreSQL + Redis + Nginx
- **GitHub Actions CI/CD** — 多版本 Node.js 矩阵测试 → 自动部署
- **灰度发布** — 特性开关控制流量比例 + 健康监控 + 自动回滚
- **数据库备份恢复** — 全量 + 增量备份，支持 S3 远程存储
- **Prisma 数据库迁移** — 版本化迁移脚本，支持 deploy/rollback/dry-run
- **优雅关闭** — SIGINT 信号处理，连接池和缓存有序释放
- **API 文档** — Swagger UI 自动生成（非生产环境可访问）

### 高级特性
- **OAuth 第三方登录** — GitHub / Google（Passport.js）
- **特性开关（Feature Flags）** — 百分比灰度，Redis 缓存
- **定时任务** — 缓存预热、令牌清理、统计聚合、备份、审计留存
- **多环境配置** — development / test / production / local

---

## 二、技术栈

| 层次 | 技术 |
|---|---|
| 运行时 | Node.js 18+ |
| Web 框架 | Express 5 |
| ORM | Prisma |
| 数据库 | PostgreSQL 15+ |
| 缓存 | Redis 7 |
| 认证 | JWT + bcrypt + Passport (OAuth) |
| 安全 | Helmet + CORS + rate-limit + AES-256 加密 |
| 校验 | express-validator |
| 日志 | Winston |
| 监控 | Prometheus (prom-client) |
| 调度 | node-cron |
| 邮件 | Nodemailer |
| 测试 | Jest + Supertest + Playwright (E2E) |
| 容器 | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| API 文档 | Swagger (swagger-jsdoc + swagger-ui-express) |
| 反向代理 | Nginx |
| 编辑器 | EasyMDE + marked.js |
| 前端 | HTML5 + CSS3 + 原生 JavaScript (SPA) |

---

## 三、项目结构

```
personal-blog/
├── server.js                     # 应用入口
├── Dockerfile                    # 多阶段构建
├── docker-compose.yml            # 主容器编排（app + DB + Redis + Nginx）
├── docker-compose.canary.yml     # 灰度部署容器
├── .env.example                  # 环境变量模板
│
├── prisma/
│   ├── schema.prisma             # 20+ 数据模型定义
│   ├── migrations/               # 数据库版本迁移文件
│   └── seed.js                   # 种子数据
│
├── config/                       # 集中化配置
│   ├── index.js                  # 环境感知的配置加载器
│   ├── base.js                   # 公共默认配置
│   ├── development.js            # 开发环境配置
│   ├── production.js             # 生产环境配置
│   ├── test.js                   # 测试环境配置
│   ├── swagger.js                # OpenAPI 文档定义
│   └── features.js               # 特性开关定义
│
├── controllers/                  # 业务逻辑层
│   ├── articlesController.js     # 文章 CRUD + 草稿/置顶/付费
│   ├── authController.js         # 注册/登录
│   ├── commentsController.js     # 评论嵌套回复
│   ├── tagsController.js         # 标签管理
│   ├── statsController.js        # 搜索/排行/归档/统计
│   ├── interactController.js     # 点赞/收藏/关注/购买
│   ├── creatorController.js      # 创作者中心/收益
│   ├── subscriptionController.js # 订阅方案/用户订阅
│   ├── uploadController.js       # 图片上传
│   ├── seoController.js          # RSS + 站点地图
│   ├── adminController.js        # 后台管理
│   ├── auditController.js        # 审计日志查询
│   └── featureFlagsController.js # 特性开关管理
│
├── routes/                       # 路由 + 参数验证
│   ├── articles.js / auth.js / comments.js / tags.js
│   ├── stats.js / interact.js / creator.js / subscription.js
│   ├── upload.js / seo.js / oauth.js / health.js
│   └── admin.js / audit.js / featureFlags.js
│
├── middleware/                   # 中间件链
│   ├── security.js               # Helmet + CORS
│   ├── auth.js                   # JWT 认证（必须/可选）
│   ├── adminAuth.js              # 管理员角色校验
│   ├── rateLimiter.js            # 三级限流
│   ├── cache.js                  # Redis 缓存中间件
│   ├── validator.js              # 请求校验规则
│   ├── errorHandler.js           # 全局错误 + 404 处理
│   ├── requestLogger.js          # 结构化请求日志
│   ├── auditLogger.js            # 操作审计记录
│   ├── featureFlags.js           # 特性开关注入
│   └── subscription.js           # 订阅访问控制
│
├── utils/                        # 工具模块
│   ├── cache.js                  # Redis 客户端封装
│   ├── database.js               # 连接池 + 健康检查
│   ├── logger.js                 # Winston 日志接口
│   ├── encryption.js             # AES-256 字段加密
│   ├── keyRotation.js            # 密钥轮换管理
│   ├── metrics.js                # Prometheus 指标
│   ├── scheduler.js              # 定时任务注册中心
│   ├── email.js                  # 邮件发送服务
│   ├── auditService.js           # 审计日志写入
│   ├── featureFlags.js           # 特性开关引擎
│   ├── sanitize.js               # XSS 清洗
│   └── response.js               # 统一响应格式
│
├── jobs/                         # 后台定时任务
│   ├── cacheWarmer.js            # 缓存预热
│   ├── cleanupExpiredTokens.js   # 过期令牌清理
│   ├── statsAggregation.js       # 站点统计聚合
│   ├── backupDatabase.js         # 数据库自动备份
│   ├── subscriptionChecker.js    # 过期订阅检查
│   └── auditRetention.js         # 审计日志留存清理
│
├── scripts/
│   └── backup/                   # 备份恢复工具
│       ├── backup.js             # 全量 + 增量备份
│       ├── restore.js            # 从备份恢复
│       └── schedule.js           # 备份定时调度
│
├── strategies/                   # Passport OAuth 策略
│   ├── github.js
│   └── google.js
│
├── tests/
│   ├── setup.js                  # 测试环境初始化
│   ├── helpers.js                # 测试辅助工具
│   ├── app.js                    # 测试应用实例
│   ├── articles.test.js          # 文章接口测试
│   ├── auth.test.js              # 认证接口测试
│   ├── comments.test.js          # 评论接口测试
│   ├── interact.test.js          # 互动接口测试
│   ├── subscription.test.js      # 订阅接口测试
│   ├── unit/                     # 单元测试（controllers/middleware/utils）
│   └── e2e/                      # Playwright 端到端测试
│       ├── article.spec.js
│       ├── auth.spec.js
│       ├── comment.spec.js
│       └── subscription.spec.js
│
├── pages/                        # 前端 SPA 页面
│   ├── index.html / article.html / login.html
│   ├── write.html / edit.html / dashboard.html
│   ├── creator.html / subscribe.html
│   ├── style.css
│   └── *.js
│
├── admin/                        # 后台管理界面（静态 SPA）
│   ├── index.html / login.html
│   ├── articles.html / comments.html / users.html
│   ├── settings.html / stats.html
│   ├── style.css
│   └── js/
│
├── public/                       # 静态资源（浏览器缓存 7 天）
├── uploads/                      # 上传图片（浏览器缓存 30 天）
├── nginx/
│   └── default.conf              # Nginx 反向代理配置
│
├── .github/workflows/
│   ├── deploy.yml                # CI/CD：测试 → 检查 → 部署
│   ├── coverage.yml              # 测试覆盖率 + Codecov 上传
│   ├── canary-deploy.yml         # 灰度发布 + 健康监控
│   └── backup.yml                # 手动备份/恢复触发
│
├── deploy-migration.js           # 迁移部署脚本（含 dry-run）
├── rollback-migration.js         # 迁移回滚脚本
├── eslint.config.js              # ESLint 配置
├── jest.config.js                # Jest 配置
└── playwright.config.js          # Playwright E2E 配置
```

---

## 四、API 接口文档

> 非生产环境下可通过 `/api-docs` 访问 Swagger UI。

### 认证

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `POST` | `/api/register` | 否 | 用户注册 |
| `POST` | `/api/login` | 否 | 用户登录，返回 JWT |
| `GET` | `/api/auth/github` | 否 | GitHub OAuth 登录 |
| `GET` | `/api/auth/google` | 否 | Google OAuth 登录 |

### 文章

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `GET` | `/api/articles` | 可选 | 文章列表（分页） |
| `GET` | `/api/articles/:id` | 可选 | 文章详情 |
| `POST` | `/api/articles` | 是 | 创建文章 |
| `PUT` | `/api/articles/:id` | 是 | 更新文章 |
| `DELETE` | `/api/articles/:id` | 是 | 删除文章 |
| `PUT` | `/api/articles/:id/pin` | 是 | 置顶/取消置顶 |
| `POST` | `/api/articles/draft` | 是 | 保存草稿 |
| `GET` | `/api/articles/drafts/list` | 是 | 草稿列表 |
| `PUT` | `/api/articles/:id/publish` | 是 | 发布草稿 |

### 评论

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `GET` | `/api/articles/:id/comments` | 否 | 获取评论（含回复） |
| `POST` | `/api/articles/:id/comments` | 否 | 发表评论 |
| `DELETE` | `/api/comments/:id` | 是 | 删除评论 |

### 标签

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `GET` | `/api/tags` | 否 | 标签列表 |
| `POST` | `/api/tags` | 是 | 创建标签 |
| `POST` | `/api/articles/:id/tags` | 是 | 为文章添加标签 |
| `DELETE` | `/api/articles/:id/tags/:tagId` | 是 | 移除文章标签 |

### 社交互动

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `POST` | `/api/articles/:id/like` | 是 | 点赞文章 |
| `DELETE` | `/api/articles/:id/like` | 是 | 取消点赞 |
| `POST` | `/api/articles/:id/collect` | 是 | 收藏文章 |
| `DELETE` | `/api/articles/:id/collect` | 是 | 取消收藏 |
| `POST` | `/api/users/:id/follow` | 是 | 关注用户 |
| `DELETE` | `/api/users/:id/follow` | 是 | 取消关注 |
| `GET` | `/api/user/likes` | 是 | 我的点赞 |
| `GET` | `/api/user/collections` | 是 | 我的收藏 |
| `GET` | `/api/user/followers` | 是 | 我的粉丝 |
| `GET` | `/api/user/following` | 是 | 我的关注 |
| `GET` | `/api/authors/popular` | 否 | 热门作者 |

### 订阅与购买

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `GET` | `/api/subscription/plans` | 否 | 订阅方案列表 |
| `GET` | `/api/subscription/status` | 是 | 我的订阅状态 |
| `POST` | `/api/subscription/subscribe` | 是 | 订阅 |
| `POST` | `/api/subscription/cancel` | 是 | 取消订阅 |
| `GET` | `/api/subscription/history` | 是 | 订阅历史 |
| `POST` | `/api/articles/:id/purchase` | 是 | 购买付费文章 |
| `GET` | `/api/articles/:id/access` | 可选 | 检查文章访问权限 |

### 创作者中心

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `GET` | `/api/creator/stats` | 是 | 创作者统计 |
| `GET` | `/api/creator/articles` | 是 | 我的所有文章 |
| `GET` | `/api/creator/earnings` | 是 | 收入明细 |
| `PUT` | `/api/creator/profile` | 是 | 更新创作者资料 |
| `PUT` | `/api/creator/articles/:id/paid` | 是 | 设置文章为付费 |

### 发现

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `GET` | `/api/search?q=关键词` | 否 | 全文搜索 |
| `GET` | `/api/popular` | 否 | 热门文章 Top 5 |
| `GET` | `/api/archive` | 否 | 按年月归档 |
| `GET` | `/api/stats` | 否 | 站点统计数据 |

### 后台管理

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| `POST` | `/api/admin/login` | 否 | 管理员登录 |
| `GET` | `/api/admin/dashboard` | 管理员 | 管理仪表盘 |
| `GET` | `/api/admin/articles` | 管理员 | 文章管理 |
| `GET` | `/api/admin/comments` | 管理员 | 评论管理 |
| `GET` | `/api/admin/users` | 管理员 | 用户管理 |
| `PUT` | `/api/admin/settings` | 管理员 | 系统设置 |
| `GET` | `/api/admin/features` | 管理员 | 特性开关列表 |
| `PUT` | `/api/admin/features/:name` | 管理员 | 更新特性开关 |
| `GET` | `/api/audit/logs` | 管理员 | 查询审计日志 |

### SEO 与健康检查

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/rss.xml` | RSS 订阅源 |
| `GET` | `/sitemap.xml` | 网站地图 |
| `GET` | `/api/health/db` | 数据库健康检查 |

---

## 五、数据库

采用 PostgreSQL + Prisma ORM，共 20+ 数据模型：

| 模型 | 说明 |
|---|---|
| `User` | 用户账户（OAuth、角色、加密存储 PII） |
| `Article` | 文章（状态、置顶、付费、价格） |
| `Tag` / `ArticleTag` | 多对多标签系统 |
| `Comment` | 嵌套评论（含审核状态） |
| `ArticleLike` / `ArticleCollection` | 用户互动 |
| `UserFollow` | 社交关注关系 |
| `ArticlePurchase` | 付费文章购买记录 |
| `CreatorProfile` | 创作者扩展资料 |
| `SubscriptionPlan` / `UserSubscription` | 订阅方案与用户订阅 |
| `PaymentRecord` | 支付交易记录 |
| `ApiKey` | 加密存储的第三方 API 密钥 |
| `KeyRotationLog` | 加密密钥轮换历史 |
| `AdminLog` | 管理员操作日志 |
| `SystemSetting` | 系统配置键值存储 |
| `FeatureFlag` | 特性灰度开关 |
| `AuditLog` | 完整操作审计日志 |

连接池通过 Prisma 连接参数配置（`connection_limit`、`pool_timeout` 等）。

---

## 六、快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 15+
- Redis 7+（可选，不配置时自动回退为内存缓存）
- npm

### 本地运行

```bash
# 1. 克隆项目
git clone https://github.com/wanlte/personal-blog.git
cd personal-blog

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL、JWT_SECRET 等

# 4. 生成 Prisma Client 并执行迁移
npx prisma generate
npx prisma migrate dev

# 5.（可选）填充种子数据
npm run db:seed

# 6. 启动开发服务器
npm run start:dev
# 访问 http://localhost:3000
# API 文档 http://localhost:3000/api-docs
```

### Docker Compose

```bash
# 一键启动所有服务（app + PostgreSQL + Redis + Nginx）
docker compose up -d

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f app
```

---

## 七、环境变量

复制 `.env.example` 为 `.env` 后配置：

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `PORT` | 否 | `3000` | 服务端口 |
| `NODE_ENV` | 否 | `development` | 运行环境 |
| `DATABASE_URL` | 是 | — | PostgreSQL 连接字符串 |
| `REDIS_URL` | 否 | — | Redis 连接字符串 |
| `SKIP_REDIS` | 否 | `false` | 禁用 Redis，使用内存缓存 |
| `JWT_SECRET` | 是 | — | JWT 签名密钥 |
| `FRONTEND_URL` | 否 | — | 前端地址（CORS；开发环境自动允许 localhost） |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | 否 | — | GitHub OAuth 应用凭据 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 否 | — | Google OAuth 凭据 |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | 否 | — | 邮件通知配置 |
| `SITE_NAME` | 否 | `个人博客` | 站点名称 |
| `SITE_URL` | 否 | `http://localhost:3000` | 站点公开 URL |
| `LOG_LEVEL` | 否 | `info` | 日志级别 |
| `ENCRYPTION_KEY` | 否 | — | AES-256 敏感数据加密密钥 |
| `FEATURE_FLAGS_ENABLED` | 否 | `true` | 是否启用特性开关 |

---

## 八、NPM 脚本

### 应用

| 命令 | 说明 |
|---|---|
| `npm start` | 启动生产模式 |
| `npm run start:dev` | 启动开发模式 |
| `npm run start:prod` | 启动生产模式 |
| `npm run start:test` | 启动测试模式 |

### 测试

| 命令 | 说明 |
|---|---|
| `npm test` | 运行 Jest 单元/集成测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run test:coverage` | 测试 + 覆盖率报告 |
| `npm run test:badge` | 生成覆盖率徽章 |
| `npm run test:e2e` | 运行 Playwright E2E 测试 |
| `npm run test:e2e:headed` | E2E 测试（显示浏览器） |
| `npm run test:e2e:ui` | E2E 测试（Playwright UI 模式） |

### 数据库

| 命令 | 说明 |
|---|---|
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:push` | 直接推送 Schema（无迁移文件） |
| `npm run db:migrate:dev` | 开发环境创建新迁移 |
| `npm run db:migrate` | 部署迁移（支持 `--dry-run`） |
| `npm run db:rollback` | 回滚迁移（支持 `--dry-run`） |
| `npm run db:status` | 查看迁移状态 |
| `npm run db:reset` | 重置数据库 |
| `npm run db:seed` | 填充种子数据 |

---

## 九、测试体系

**Jest** — 单元测试与集成测试，覆盖率阈值 80%+：

```
tests/
├── articles.test.js      # 文章接口测试
├── auth.test.js          # 认证接口测试
├── comments.test.js      # 评论系统测试
├── interact.test.js      # 点赞/收藏/关注测试
├── subscription.test.js  # 订阅系统测试
├── unit/                 # 单元测试（controllers、middleware、utils）
└── helpers.js            # 测试辅助函数
```

**Playwright** — 端到端浏览器测试：

```
tests/e2e/
├── article.spec.js       # 文章 CRUD 流程
├── auth.spec.js          # 登录注册流程
├── comment.spec.js       # 评论发表流程
├── subscription.spec.js  # 订阅购买流程
└── server.js             # E2E 测试独立服务器
```

---

## 十、CI/CD

### 主流水线（`deploy.yml`）

```
往 main 分支 Push/PR 时自动触发
    ├── 测试（Node 18, 20, 22 × PostgreSQL）
    │   ├── Install → Prisma generate → DB push → Jest + coverage
    │   └── 上传覆盖率报告
    ├── 代码检查（ESLint）
    └── 部署（仅 main 分支 push，需测试和检查通过）
        └── SSH → git pull → npm ci → prisma migrate → pm2 restart
```

### 覆盖率流水线（`coverage.yml`）

```
Push/PR 到 main
    └── Jest + coverage → 生成徽章 → 上传 Codecov
```

### 灰度发布（`canary-deploy.yml`）

```
手动触发
    ├── 配置灰度比例（1-100%）
    ├── 构建并推送 canary Docker 镜像
    ├── 启动 canary 容器（端口 3001）
    ├── 健康监控循环（可配置时长）
    ├── 自动提升至 100%（可选）
    └── 连续 3 次失败自动回滚
```

### 备份（`backup.yml`）

```
手动触发
    ├── 全量备份
    ├── 增量备份
    └── 列出可用备份
```

---

## 十一、部署

### Docker Compose（推荐）

```bash
# 生产部署
docker compose up -d

# 灰度部署（与主实例并行运行）
docker compose -f docker-compose.canary.yml up -d
```

### 服务清单

| 服务 | 容器名 | 端口 |
|---|---|---|
| Express 应用 | `blog-app` | 3000 |
| PostgreSQL 15 | `blog-db` | 5432 |
| Redis 7 | `blog-redis` | 6379 |
| Nginx | `blog-nginx` | 80/443 |

### 手动部署

```bash
npm ci --omit=dev
npx prisma generate
npx prisma migrate deploy
node server.js
```

---

## 十二、定时任务

| 任务 | 频率 | 说明 |
|---|---|---|
| 缓存预热 | 每 30 分钟 | 预加载热门内容到 Redis |
| 令牌清理 | 每天 | 清除过期 JWT 令牌 |
| 统计聚合 | 每小时 | 汇总站点统计数据 |
| 数据库备份 | 每天全量 + 每小时增量 | 自动备份并上传 S3 |
| 订阅检查 | 每天 | 检查并标记过期订阅 |
| 审计留存 | 每周 | 清理 90 天前的审计日志 |

---

## 十三、系统架构

```
浏览器 / 客户端
    │
    ▼
┌──────────────────────────────────────┐
│           Nginx :80                   │
│    静态文件 + 反向代理                │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│        Express App :3000             │
│                                      │
│  中间件流水线:                        │
│  Logger → Helmet → CORS → Limiter   │
│  → Compress → JSON → Passport       │
│  → Audit → FeatureFlags → Routes    │
│                                      │
│  路由处理 → 控制器                    │
│       │              │               │
│       ▼              ▼               │
│  ┌────────┐    ┌─────────┐          │
│  │Prisma  │    │  Redis  │          │
│  │(PgSQL) │    │ (缓存)  │          │
│  └────────┘    └─────────┘          │
│                                      │
│  定时任务 (node-cron):               │
│  缓存预热、令牌清理、统计聚合、       │
│  数据库备份、订阅检查、审计留存       │
└──────────────────────────────────────┘
```

---

## 十四、许可证

ISC
