# ===== 构建阶段 =====
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖所需构建工具
RUN apk add --no-cache python3 make g++ openssl

# 复制依赖清单
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# 安装所有依赖（含 devDependencies，因为 prisma CLI 需要）
RUN npm ci

# 生成 Prisma Client
RUN npx prisma generate

# ===== 生产阶段 =====
FROM node:18-alpine

WORKDIR /app

# 安装 openssl（Prisma 需要）和 tini（优雅处理信号）
RUN apk add --no-cache openssl tini

# 创建非 root 用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# 从构建阶段复制必要文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# 复制应用代码
COPY package.json ./
COPY server.js ./
COPY routes/ ./routes/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY utils/ ./utils/
COPY db/ ./db/
COPY public/ ./public/

# 创建上传目录并设置权限
RUN mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 3000

# 使用 tini 作为入口（正确处理 PID 1 信号）
ENTRYPOINT ["/sbin/tini", "--"]

# 启动命令：生成 Prisma Client → 执行迁移 → 启动服务
CMD sh -c "npx prisma generate && \
           npx prisma migrate deploy && \
           node server.js"
