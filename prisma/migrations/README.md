# 数据库迁移文件

本目录存放 Prisma 迁移文件。

## 使用方法

```bash
# 安装依赖后，生成 Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate dev --name init

# 或推送 schema 到数据库（不生成迁移文件）
npx prisma db push

# 运行 seed 脚本
npx prisma db seed
```
