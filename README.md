个人博客系统 - 完整项目总结

一、项目概述

一个功能完整的全栈博客系统，支持文章管理、用户认证、评论互动、标签分类、搜索归档、数据统计等核心功能。技术栈为 HTML5 + CSS3 + 原生 JavaScript + Node.js + Express + SQLite。


二、完整功能清单

1. 用户系统
用户注册：用户名加密码加邮箱用于通知
用户登录：JWT Token认证
权限控制：只能编辑或删除自己的文章
登录状态：首页显示用户信息，支持退出

2. 文章管理
发布文章：Markdown编辑器，支持实时预览
编辑文章：修改标题、内容、摘要
删除文章：确认后删除
文章置顶：重要文章固定在顶部
草稿箱：保存未完成的文章，支持发布

3. 交互功能
评论系统：登录后可评论，可删除自己的评论
标签系统：文章可添加多个标签，点击筛选
搜索功能：全文搜索，关键词高亮
图片上传：支持上传图片，Markdown自动插入

4. 展示功能
文章列表：分页展示，显示标题、摘要、作者、阅读量
文章详情：完整内容，Markdown渲染
热门排行榜：按阅读量排序前五名
文章归档：按年月分组显示
数据仪表盘：总文章数、阅读量、用户数、趋势图

5. SEO与优化
RSS订阅：生成订阅源
网站地图：供搜索引擎抓取
Meta标签：动态标题、描述、开放图谱标签
性能优化：骨架屏、懒加载、缓存、压缩


三、API接口清单

POST /api/register 用户注册 不需要认证

POST /api/login 用户登录 不需要认证

GET /api/articles 获取文章列表 不需要认证

GET /api/articles/:id 获取单篇文章 不需要认证

POST /api/articles 创建文章 需要认证

PUT /api/articles/:id 更新文章 需要认证

DELETE /api/articles/:id 删除文章 需要认证

PUT /api/articles/:id/pin 置顶或取消置顶 需要认证

POST /api/articles/draft 保存草稿 需要认证

GET /api/articles/drafts 获取草稿列表 需要认证

PUT /api/articles/:id/publish 发布草稿 需要认证

GET /api/tags 获取标签列表 不需要认证

POST /api/articles/:id/tags 添加标签 需要认证

GET /api/articles/:id/tags 获取文章标签 不需要认证

GET /api/articles/:id/comments 获取评论 不需要认证

POST /api/articles/:id/comments 发表评论 不需要认证

DELETE /api/comments/:id 删除评论 需要认证

GET /api/search 搜索文章 不需要认证

GET /api/popular 热门文章 不需要认证

GET /api/archive 文章归档 不需要认证

GET /api/stats 数据统计 不需要认证

POST /api/upload 上传图片 需要认证

GET /rss.xml RSS订阅 不需要认证

GET /sitemap.xml 网站地图 不需要认证


四、技术栈详情

前端层面：HTML5语义化标签、CSS3 Flex和Grid布局及响应式动画、原生JavaScript ES6加语法、EasyMDE Markdown编辑器、marked.js Markdown解析

后端层面：Node.js运行环境、Express Web框架、SQLite3轻量级数据库、JWT用户认证、bcrypt密码加密、multer图片上传、nodemailer邮件通知

部署层面：Cyclic公网部署



五、本地运行步骤

克隆项目：git clone https://github.com/wanlte/personal-blog.git 然后 cd personal-blog

安装依赖：npm install

配置环境变量：创建.env文件，写入 JWT_SECRET=your-secret-key-2024 和 PORT=3000

初始化数据库：node db/init.js

启动服务器：node server.js

访问：浏览器打开 http://localhost:3000


六、部署到Cyclic步骤

访问 https://cyclic.sh
用GitHub登录
选择你的仓库
点击 Deploy
添加环境变量 JWT_SECRET
