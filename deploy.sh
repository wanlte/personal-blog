#!/bin/bash
# 自动部署脚本

set -e

echo "=== 1. 拉取代码 ==="
git pull origin main

echo "=== 2. 安装依赖 ==="
npm ci --production

echo "=== 3. 数据库迁移 ==="
npm run db:migrate

echo "=== 4. 运行测试 ==="
npm test

echo "=== 5. 重启服务 ==="
pm2 restart blog

echo "=== 6. 健康检查 ==="
curl -f http://localhost:3000/health || exit 1

echo "=== 部署完成 ==="
