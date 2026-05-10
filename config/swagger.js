// config/swagger.js - Swagger / OpenAPI 3.0 文档配置

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: '个人博客 API',
      version: '1.0.0',
      description:
        '个人博客系统 RESTful API 文档，提供文章管理、用户认证、评论互动、订阅付费等功能。',
      contact: {
        name: 'Blog Admin',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: '本地开发服务器',
      },
      {
        url: '/',
        description: '生产服务器（同源部署）',
      },
    ],
    tags: [
      { name: '认证', description: '用户注册与登录' },
      { name: '文章', description: '文章 CRUD、草稿、置顶' },
      { name: '评论', description: '文章评论管理' },
      { name: '标签', description: '标签分类管理' },
      { name: '统计', description: '搜索、热门、归档、站点统计' },
      { name: '上传', description: '图片上传' },
      { name: '互动', description: '点赞、收藏、关注、付费阅读' },
      { name: '订阅', description: '用户订阅方案' },
      { name: '创作者', description: '创作者数据与收益' },
      { name: 'SEO', description: 'RSS 与 Sitemap' },
      { name: 'OAuth', description: 'GitHub / Google 第三方登录' },
      { name: '管理', description: '管理员接口（内容/用户/评论/配置管理）' },
      { name: '特性开关', description: '灰度发布与特性开关管理' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '在登录接口获取 Token，格式：`Bearer <token>`',
        },
      },
      schemas: {
        // ——— 通用响应 ———
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'BAD_REQUEST' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
            requestId: { type: 'string', example: 'uuid' },
          },
        },
        // ——— 认证 ———
        RegisterRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'zhangsan', minLength: 3, maxLength: 20 },
            password: { type: 'string', example: 'Abc12345', minLength: 8 },
            planId: { type: 'integer', example: 1, description: '可选，注册时选择的订阅方案 ID' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'zhangsan' },
            password: { type: 'string', example: 'Abc12345' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '登录成功' },
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                username: { type: 'string' },
              },
            },
          },
        },
        // ——— 文章 ———
        ArticleRequest: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: { type: 'string', example: '我的第一篇博客' },
            content: { type: 'string', example: '文章内容...' },
            summary: { type: 'string', example: '文章摘要' },
          },
        },
        // ——— 评论 ———
        CommentRequest: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', example: '写得真好！' },
            userName: { type: 'string', example: '游客', description: '非登录用户昵称' },
            parentId: { type: 'integer', example: 1, description: '回复的父评论 ID' },
          },
        },
        // ——— 订阅 ———
        SubscribeRequest: {
          type: 'object',
          required: ['planId'],
          properties: {
            planId: { type: 'integer', example: 1 },
            paymentMethod: { type: 'string', example: 'alipay' },
          },
        },
        // ——— 创作者 ———
        CreatorProfileRequest: {
          type: 'object',
          properties: {
            bio: { type: 'string', example: '个人简介...' },
            avatar: { type: 'string', example: '/uploads/avatar.jpg' },
          },
        },
        PaidArticleRequest: {
          type: 'object',
          required: ['isPaid', 'price'],
          properties: {
            isPaid: { type: 'boolean', example: true },
            price: { type: 'number', example: 9.99 },
          },
        },
      },
    },
    security: [],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
