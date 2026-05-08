# 个人博客系统 - 项目文档

## 一、项目概述

这是一个功能完整的全栈个人博客系统，采用现代化的前后分离架构，支持文章管理、用户认证、社交互动、付费内容创作等核心功能。系统具备良好的可扩展性和安全性，可满足个人博主的内容创作与变现需求。

### 1.1 项目特点

- **前后分离架构**：使用原生 JavaScript 构建 SPA 应用，配合 Express RESTful API
- **内容创作工具**：集成 Markdown 编辑器，支持实时预览和图片上传
- **社交互动功能**：支持点赞、收藏、关注等社交功能
- **创作者变现**：支持付费文章、订阅会员、收入统计等创作者工具
- **SEO 优化**：内置 RSS 订阅源和网站地图生成
- **性能优化**：采用 Redis 缓存、API 响应压缩等技术提升访问速度

---

## 二、技术栈

### 2.1 后端技术

| 技术 | 用途 | 版本 |
|------|------|------|
| Node.js | JavaScript 运行时 | Latest |
| Express | Web 应用框架 | 4.x |
| Prisma | ORM 数据库工具 | Latest |
| PostgreSQL | 关系型数据库 | 15+ |
| Redis | 缓存服务器 | Latest |
| JWT | 用户身份认证 | jsonwebtoken |
| bcrypt | 密码加密 | 5.x |
| multer | 文件上传处理 | 1.x |

### 2.2 前端技术

| 技术 | 用途 |
|------|------|
| HTML5 | 页面结构 |
| CSS3 | 样式与布局 |
| JavaScript (ES6+) | 交互逻辑 |
| EasyMDE | Markdown 编辑器 |
| marked.js | Markdown 解析渲染 |

### 2.3 开发与部署

| 技术 | 用途 |
|------|------|
| npm | 包管理 |
| Git | 版本控制 |
| Cyclic | 云平台部署 |

---

## 三、项目结构

```
personal-blog/
├── controllers/              # 控制器层 - 业务逻辑处理
│   ├── articlesController.js  # 文章管理
│   ├── authController.js      # 用户认证
│   ├── commentsController.js  # 评论系统
│   ├── creatorController.js   # 创作者中心
│   ├── interactController.js  # 社交互动
│   ├── seoController.js       # SEO 功能
│   ├── statsController.js      # 数据统计
│   ├── subscriptionController.js # 订阅管理
│   ├── tagsController.js      # 标签管理
│   └── uploadController.js    # 文件上传
├── routes/                    # 路由层 - API 路由定义
│   ├── articles.js            # 文章路由
│   ├── auth.js                # 认证路由
│   ├── comments.js            # 评论路由
│   ├── creator.js             # 创作者路由
│   ├── interact.js            # 互动路由
│   ├── seo.js                 # SEO 路由
│   ├── stats.js               # 统计路由
│   ├── subscription.js        # 订阅路由
│   ├── tags.js                # 标签路由
│   └── upload.js              # 上传路由
├── middleware/                 # 中间件层
│   ├── auth.js               # JWT 认证中间件
│   ├── cache.js              # Redis 缓存中间件
│   └── subscription.js        # 订阅验证中间件
├── prisma/                     # 数据库相关
│   ├── schema.prisma         # 数据模型定义
│   └── migrations/           # 数据库迁移文件
├── public/                     # 前端静态资源
│   ├── index.html            # 首页
│   ├── article.html          # 文章详情页
│   ├── login.html            # 登录页
│   ├── write.html            # 写作页
│   ├── edit.html             # 编辑页
│   ├── dashboard.html        # 数据仪表盘
│   ├── creator.html          # 创作者中心
│   ├── subscribe.html         # 订阅页面
│   ├── style.css             # 全局样式
│   ├── *.js                  # 各页面业务逻辑
├── db/                        # 数据库初始化
├── utils/                     # 工具函数
├── server.js                  # 服务器入口
├── package.json              # 项目配置
└── README.md                  # 项目说明
```

---

## 四、功能模块

### 4.1 用户系统

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 用户注册 | 输入用户名、密码、邮箱完成注册 | 否 |
| 用户登录 | JWT Token 认证登录 | 否 |
| 权限控制 | 仅可编辑/删除自己的文章和评论 | 是 |
| 登录状态 | 首页显示用户信息，支持退出登录 | - |

#### 密码安全

- 使用 bcrypt 进行密码哈希加密
- JWT Token 用于 API 接口身份验证
- Token 过期时间可配置

---

### 4.2 文章管理

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 创建文章 | Markdown 编辑器，支持实时预览 | 是 |
| 编辑文章 | 修改标题、内容、摘要 | 是 |
| 删除文章 | 确认后删除，带权限校验 | 是 |
| 文章置顶 | 将重要文章固定在列表顶部 | 是 |
| 草稿箱 | 保存未完成的文章草稿 | 是 |
| 发布草稿 | 将草稿状态的的文章发布 | 是 |
| 付费设置 | 设置文章为付费内容及价格 | 是 |

#### 文章状态

| 状态 | 描述 |
|------|------|
| published | 已发布 - 对所有用户可见 |
| draft | 草稿 - 仅作者可见 |
| paid | 付费 - 需要购买才能阅读全文 |

---

### 4.3 评论系统

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 发表评论 | 对文章进行评论 | 否（可选登录） |
| 嵌套回复 | 支持二级回复结构 | 否（可选登录） |
| 删除评论 | 仅可删除自己的评论 | 是 |

#### 评论特性

- 支持游客评论（记录昵称）
- 登录用户评论关联用户信息
- 支持回复他人评论
- 评论按时间倒序排列

---

### 4.4 标签系统

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 创建标签 | 创建新的文章标签 | 是 |
| 添加标签 | 为文章添加一个或多个标签 | 是 |
| 移除标签 | 移除文章的某个标签 | 是 |
| 获取标签 | 获取所有标签列表 | 否 |
| 文章标签 | 获取某篇文章的所有标签 | 否 |

---

### 4.5 社交互动

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 点赞文章 | 为喜欢的文章点赞 | 是 |
| 取消点赞 | 取消已点赞的文章 | 是 |
| 收藏文章 | 收藏文章到个人收藏夹 | 是 |
| 取消收藏 | 移除已收藏的文章 | 是 |
| 关注用户 | 关注其他创作者 | 是 |
| 取消关注 | 取消已关注的用户 | 是 |
| 查看粉丝 | 查看我的粉丝列表 | 是 |
| 查看关注 | 查看我关注的用户列表 | 是 |
| 热门作者 | 获取关注量最高的作者 | 否 |

#### 互动状态

- 文章详情页显示当前用户的点赞/收藏状态
- 个人中心展示我的点赞/收藏列表
- 用户主页展示粉丝数和关注数

---

### 4.6 创作者中心

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 创作者资料 | 设置个人简介、头像 | 是 |
| 创作者统计 | 阅读量、粉丝数、收入概览 | 是 |
| 文章管理 | 查看所有文章及付费状态 | 是 |
| 收入明细 | 查看付费阅读收入记录 | 是 |
| 设置付费 | 将文章设为付费内容 | 是 |
| 实名认证 | 申请创作者实名认证 | 是 |

#### 创作者指标

| 指标 | 描述 |
|------|------|
| totalEarnings | 累计收入 |
| articleCount | 文章总数 |
| followerCount | 粉丝数量 |
| totalViews | 总阅读量 |

---

### 4.7 订阅系统

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 查看方案 | 浏览可用的订阅方案 | 否 |
| 订阅会员 | 选择方案并完成订阅 | 是 |
| 取消订阅 | 取消当前有效订阅 | 是 |
| 订阅状态 | 查看当前订阅状态 | 是 |
| 订阅历史 | 查看历史订阅记录 | 是 |

#### 订阅方案

| 字段 | 描述 |
|------|------|
| name | 方案名称（如：月度会员、年度会员） |
| price | 价格 |
| durationDays | 有效期天数 |
| features | 方案包含的功能列表 |

#### 订阅状态

| 状态 | 描述 |
|------|------|
| active | 有效 |
| expired | 已过期 |
| cancelled | 已取消 |

---

### 4.8 支付系统

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 购买文章 | 为付费文章完成支付 | 是 |
| 支付记录 | 查看历史支付记录 | 是 |

#### 支付记录

| 字段 | 描述 |
|------|------|
| amount | 支付金额 |
| paymentMethod | 支付方式 |
| status | 支付状态（pending/completed/failed/refunded） |
| transactionId | 第三方交易单号 |

---

### 4.9 展示功能

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 文章列表 | 分页展示，显示标题、摘要、作者 | 否 |
| 文章详情 | 完整内容，Markdown 渲染 | 否 |
| 热门排行 | 按阅读量排序的前 5 篇文章 | 否 |
| 文章归档 | 按年月分组显示所有文章 | 否 |
| 搜索功能 | 全文搜索，关键词高亮 | 否 |
| 数据仪表盘 | 总文章数、阅读量、用户数、趋势图 | 是 |

---

### 4.10 SEO 优化

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| RSS 订阅 | 生成符合规范的订阅源 | 否 |
| 网站地图 | 生成 XML 格式的网站地图 | 否 |
| Meta 标签 | 动态生成标题、描述、开放图谱 | 否 |

---

### 4.11 文件上传

#### 功能列表

| 功能 | 描述 | 认证要求 |
|------|------|----------|
| 图片上传 | 上传文章配图 | 是 |

#### 上传限制

| 限制项 | 值 |
|--------|------|
| 文件类型 | jpeg, jpg, png, gif, webp |
| 文件大小 | 5MB |
| 存储路径 | /uploads/ 目录 |

---

## 五、数据库设计

### 5.1 数据模型

#### 用户表 (users)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| username | String | 用户名，唯一 |
| password | String | 密码（bcrypt 加密） |
| createdAt | DateTime | 创建时间 |

#### 文章表 (articles)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| title | String | 标题 |
| content | Text | Markdown 内容 |
| summary | Text | 摘要 |
| userId | Int | 作者 ID |
| views | Int | 阅读量 |
| status | String | 状态（published/draft） |
| isPinned | Boolean | 是否置顶 |
| isPaid | Boolean | 是否付费 |
| price | Decimal | 付费价格 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### 标签表 (tags)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| name | String | 标签名，唯一 |
| createdAt | DateTime | 创建时间 |

#### 文章-标签关联表 (article_tags)

| 字段 | 类型 | 描述 |
|------|------|------|
| articleId | Int | 文章 ID |
| tagId | Int | 标签 ID |

#### 评论表 (comments)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| content | Text | 评论内容 |
| articleId | Int | 文章 ID |
| userId | Int? | 用户 ID（可为游客） |
| userName | String? | 游客昵称 |
| parentId | Int? | 父评论 ID（嵌套） |
| createdAt | DateTime | 创建时间 |

#### 文章点赞表 (article_likes)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| articleId | Int | 文章 ID |
| userId | Int | 用户 ID |
| createdAt | DateTime | 创建时间 |
| 约束 | - | 联合唯一：articleId + userId |

#### 文章收藏表 (article_collections)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| articleId | Int | 文章 ID |
| userId | Int | 用户 ID |
| createdAt | DateTime | 创建时间 |
| 约束 | - | 联合唯一：articleId + userId |

#### 用户关注表 (user_follows)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| followerId | Int | 关注者 ID |
| followingId | Int | 被关注者 ID |
| createdAt | DateTime | 创建时间 |
| 约束 | - | 联合唯一：followerId + followingId |

#### 文章购买表 (article_purchases)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| articleId | Int | 文章 ID |
| userId | Int | 用户 ID |
| amount | Decimal | 支付金额 |
| createdAt | DateTime | 创建时间 |
| 约束 | - | 联合唯一：articleId + userId |

#### 创作者资料表 (creator_profiles)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| userId | Int | 用户 ID，唯一 |
| bio | Text | 个人简介 |
| avatar | String | 头像 URL |
| isVerified | Boolean | 是否实名认证 |
| totalEarnings | Decimal | 累计收入 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

#### 订阅方案表 (subscription_plans)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| name | String | 方案名称 |
| price | Decimal | 价格 |
| durationDays | Int | 有效期天数 |
| features | JSON | 功能列表 |
| isActive | Boolean | 是否启用 |
| createdAt | DateTime | 创建时间 |

#### 用户订阅表 (user_subscriptions)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| userId | Int | 用户 ID |
| planId | Int | 方案 ID |
| status | String | 状态（active/expired/cancelled） |
| startDate | DateTime | 开始日期 |
| endDate | DateTime | 结束日期 |
| createdAt | DateTime | 创建时间 |

#### 支付记录表 (payment_records)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | Int | 主键，自增 |
| userId | Int | 用户 ID |
| subscriptionId | Int? | 订阅 ID |
| amount | Decimal | 支付金额 |
| paymentMethod | String | 支付方式 |
| status | String | 状态 |
| transactionId | String | 交易单号 |
| createdAt | DateTime | 创建时间 |

---

## 六、API 接口文档

### 6.1 认证接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | /api/register | 用户注册 | 否 |
| POST | /api/login | 用户登录 | 否 |

### 6.2 文章接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/articles | 获取文章列表 | 可选 |
| GET | /api/articles/:id | 获取单篇文章 | 可选 |
| POST | /api/articles | 创建文章 | 是 |
| PUT | /api/articles/:id | 更新文章 | 是 |
| DELETE | /api/articles/:id | 删除文章 | 是 |
| PUT | /api/articles/:id/pin | 置顶/取消置顶 | 是 |
| POST | /api/articles/draft | 保存草稿 | 是 |
| GET | /api/articles/drafts/list | 获取草稿列表 | 是 |
| PUT | /api/articles/:id/publish | 发布草稿 | 是 |

### 6.3 评论接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/articles/:id/comments | 获取评论列表 | 否 |
| POST | /api/articles/:id/comments | 发表评论 | 否 |
| DELETE | /api/comments/:id | 删除评论 | 是 |

### 6.4 标签接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/tags | 获取所有标签 | 否 |
| POST | /api/tags | 创建标签 | 是 |
| POST | /api/articles/:id/tags | 添加标签到文章 | 是 |
| GET | /api/articles/:id/tags | 获取文章标签 | 否 |
| DELETE | /api/articles/:id/tags/:tagId | 删除文章标签 | 是 |

### 6.5 统计接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/search | 搜索文章 | 否 |
| GET | /api/popular | 热门文章 | 否 |
| GET | /api/archive | 文章归档 | 否 |
| GET | /api/archive/:yearMonth | 指定月份文章 | 否 |
| GET | /api/stats | 统计数据 | 否 |

### 6.6 上传接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | /api/upload | 上传图片 | 是 |

### 6.7 互动接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/authors/popular | 热门作者 | 否 |
| GET | /api/users/:id | 用户信息 | 可选 |
| POST | /api/users/:id/follow | 关注用户 | 是 |
| DELETE | /api/users/:id/follow | 取消关注 | 是 |
| GET | /api/user/followers | 我的粉丝 | 是 |
| GET | /api/user/following | 我的关注 | 是 |
| POST | /api/articles/:id/like | 点赞文章 | 是 |
| DELETE | /api/articles/:id/like | 取消点赞 | 是 |
| POST | /api/articles/:id/collect | 收藏文章 | 是 |
| DELETE | /api/articles/:id/collect | 取消收藏 | 是 |
| GET | /api/user/likes | 我的点赞列表 | 是 |
| GET | /api/user/collections | 我的收藏列表 | 是 |
| GET | /api/articles/:id/interaction | 文章互动状态 | 可选 |
| POST | /api/articles/:id/purchase | 购买付费文章 | 是 |
| GET | /api/articles/:id/access | 检查文章访问权限 | 可选 |

### 6.8 订阅接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/subscription/plans | 订阅方案列表 | 否 |
| GET | /api/subscription/status | 订阅状态 | 是 |
| POST | /api/subscription/subscribe | 订阅 | 是 |
| POST | /api/subscription/cancel | 取消订阅 | 是 |
| GET | /api/subscription/history | 订阅历史 | 是 |

### 6.9 创作者接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /api/creator/stats | 创作者统计 | 是 |
| GET | /api/creator/articles | 创作者文章列表 | 是 |
| GET | /api/creator/earnings | 收入明细 | 是 |
| PUT | /api/creator/profile | 更新资料 | 是 |
| PUT | /api/creator/articles/:id/paid | 设置付费 | 是 |

### 6.10 SEO 接口

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | /rss.xml | RSS 订阅源 | 否 |
| GET | /sitemap.xml | 网站地图 | 否 |

---

## 七、中间件

### 7.1 认证中间件 (middleware/auth.js)

| 中间件 | 描述 |
|--------|------|
| authenticateToken | 强制认证，未登录返回 401 |
| optionalAuth | 可选认证，未登录继续执行 |

### 7.2 缓存中间件 (middleware/cache.js)

| 配置 | 描述 |
|------|------|
| CACHE_KEYS | 缓存键定义 |
| CACHE_TTL | 缓存过期时间配置 |

### 7.3 订阅中间件 (middleware/subscription.js)

| 中间件 | 描述 |
|--------|------|
| requireSubscription | 需要有效订阅才能访问 |

---

## 八、性能优化

### 8.1 缓存策略

| 缓存内容 | TTL | 描述 |
|----------|-----|------|
| 文章列表 | 5 分钟 | 首页文章列表缓存 |
| 文章详情 | 10 分钟 | 单篇文章详情缓存 |
| 热门文章 | 30 分钟 | 排行榜缓存 |
| 标签列表 | 1 小时 | 标签云缓存 |
| 用户信息 | 5 分钟 | 用户资料缓存 |

### 8.2 响应压缩

- 使用 `compression` 中间件压缩 HTTP 响应

### 8.3 静态资源缓存

| 资源类型 | 缓存时间 |
|----------|----------|
| public 目录 | 7 天 |
| uploads 目录 | 30 天 |

---

## 九、部署说明

### 9.1 环境要求

- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 9.2 环境变量

| 变量 | 描述 | 示例 |
|------|------|------|
| DATABASE_URL | PostgreSQL 连接地址 | postgresql://user:pass@host:5432/db |
| REDIS_URL | Redis 连接地址 | redis://localhost:6379 |
| JWT_SECRET | JWT 签名密钥 | your-secret-key |
| PORT | 服务端口 | 3000 |

### 9.3 部署步骤

1. 安装依赖：`npm install`
2. 配置环境变量
3. 数据库迁移：`npx prisma migrate deploy`
4. 启动服务：`node server.js`

---

## 十、页面清单

| 页面 | 文件 | 描述 |
|------|------|------|
| 首页 | index.html | 文章列表、热门文章、标签云 |
| 文章详情 | article.html | 全文阅读、评论、互动 |
| 登录 | login.html | 用户登录 |
| 写作 | write.html | 创建新文章 |
| 编辑 | edit.html | 编辑现有文章 |
| 仪表盘 | dashboard.html | 数据统计概览 |
| 创作者中心 | creator.html | 创作者管理后台 |
| 订阅 | subscribe.html | 会员订阅页面 |

---

## 更新日志

### v2.0 (当前版本)

- 新增 PostgreSQL 数据库支持
- 新增 Redis 缓存系统
- 新增创作者中心和付费文章功能
- 新增订阅会员系统
- 新增完整的社交互动功能
- 重构路由架构，采用模块化设计

### v1.0 (初始版本)

- 基础博客功能
- 用户认证系统
- Markdown 编辑器
- RSS 和网站地图

具备：

✅ Winston 日志系统
✅ Prometheus 监控
✅ Rate Limiter 限流
✅ Docker + Docker Compose 容器化
✅ Jest 测试框架
✅ Redis 缓存
✅ PostgreSQL 数据库
✅ Nginx 反向代理配置
✅ 优雅关闭处理
✅ 请求追踪 ID
✅ 输入验证 (express-validator)
✅ JWT 认证
✅ 模块化路由和控制器
还缺少的：

❌ Helmet 安全头

❌ CORS 跨域配置

❌ 全局错误处理中间件

❌ CI/CD 流水线 (GitHub Actions)

❌ API 文档自动生成

❌ 数据迁移脚本版本管理

❌ 定时任务/队列系统

❌ WebSocket 实时功能

❌ SSO/OAuth 第三方登录

❌ 数据库连接池配置

❌ 单元测试覆盖率

❌ E2E 端到端测试

❌ 多环境配置管理

❌ 敏感信息加密存储

❌ 后台管理界面

❌ 操作审计日志

❌ 灰度发布支持

❌ 备份恢复机制

接下来需要整理一份完整的清单，列出所有已实现的功能和待完善的部分。

根据我对项目的全面分析，你已经有了相当完善的企业级基础架构！以下是详细评估：

✅ 已具备的企业级组件
类别	组件	状态
日志系统	Winston 结构化日志 + 请求追踪 ID	✅
监控	Prometheus metrics	✅
限流	express-rate-limit + Redis 存储	✅
容器化	Dockerfile + Docker Compose	✅
测试	Jest + Supertest	✅
数据库	PostgreSQL + Prisma ORM	✅
缓存	Redis 缓存中间件	✅
反向代理	Nginx 配置	✅
认证	JWT + bcrypt	✅
验证	express-validator	✅
优雅关闭	SIGINT 处理	✅
压缩	gzip 压缩	✅
❌ 距企业化还缺少的组件
1. 安全增强（高优先级）
缺失项	说明	AI提示词
Helmet	安全响应头 (CSP, XSS, 点击劫持防护)	帮我添加 helmet 中间件和 CORS 配置
CORS	跨域资源共享配置	
XSS Sanitization	请求/响应 XSS 防护	
SQL Injection	Prisma 有防护，但需确认	
2. 全局错误处理（中优先级）
缺失项	说明	AI提示词
统一错误响应	所有错误返回统一 JSON 格式	帮我创建全局错误处理中间件
404 处理	未匹配路由统一处理	
Async 错误捕获	避免 async/await 未捕获错误	
3. CI/CD 流水线（高优先级）
缺失项	说明	AI提示词
GitHub Actions	自动测试、构建、部署	帮我创建 GitHub Actions CI/CD 流程
自动部署	代码推送后自动部署	
环境检查	部署前环境验证	
4. 运维工具（中优先级）
缺失项	说明	AI提示词
备份脚本	数据库自动备份	帮我创建数据库备份脚本
健康检查端点	/health 详细健康状态	帮我添加 /health 健康检查接口
Graceful Degradation	服务降级策略	
告警机制	错误率/响应时间告警	
5. API 文档（低优先级）
缺失项	说明	AI提示词
Swagger/OpenAPI	自动生成 API 文档	帮我用 swagger-jsdoc 生成 API 文档
6. 高级功能（可选）
缺失项	说明
WebSocket	实时评论通知
消息队列	邮件发送、通知等异步任务
OAuth 登录	GitHub/Google 第三方登录
后台管理	Admin 管理界面
📊 企业化成熟度评分
code
┌─────────────────────────────────────────────┐
│  安全性     ████████░░  80%                  │
│  可观测性   █████████░  90%                  │
│  测试       ███████░░░  70%                  │
│  部署       █████████░  90%                  │
│  文档       █████░░░░░  50%                  │
│  运维工具   ████░░░░░░  40%                  │
└─────────────────────────────────────────────┘
        总体成熟度: 约 70%
