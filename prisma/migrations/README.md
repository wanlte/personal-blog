# 数据库迁移文件

本目录存放 Prisma 迁移文件，由 `prisma migrate dev` 自动生成。

## 迁移命名规范

```
prisma/migrations/YYYYMMDDHHMMSS_description/
├── migration.sql          # 正向迁移 SQL
└── down.sql               # （手动维护）回滚 SQL
```

- **时间戳**：`YYYYMMDDHHMMSS` 格式，精确到秒，确保全局唯一
- **描述**：snake_case 简短英文描述，如 `add_user_table`、`add_payment_fields`
- 示例：`20260508143000_add_user_table`

## 日常开发流程

```bash
# 1. 修改 prisma/schema.prisma

# 2. 生成迁移文件（开发环境）
npx prisma migrate dev --name add_new_feature

# 3. 验证迁移正确性
npm run db:status

# 4. 提交迁移文件到 Git
git add prisma/migrations/
git commit -m "db: add new_feature migration"
```

## 生产部署流程

```bash
# 1. 拉取最新代码（含新迁移文件）
git pull origin main

# 2. 预览待执行的迁移（dry-run）
npm run db:migrate -- --dry-run

# 3. 执行生产迁移
npm run db:migrate

# 4. 验证迁移状态
npm run db:status
```

## 回滚流程

```bash
# 预览将要回滚的迁移
npm run db:rollback -- --dry-run

# 执行回滚（回退最近一次迁移）
npm run db:rollback

# 回退指定迁移
npm run db:rollback -- --name 20260508143000_add_new_feature
```

## 安全注意事项

- **生产环境永远不要使用 `prisma migrate dev`**，仅用 `prisma migrate deploy`
- **`prisma migrate deploy` 不会触发数据丢失**：如果迁移包含 `DROP` 操作，会报错并终止
- **迁移前必须备份数据库**：`pg_dump DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql`
- **并发防护**：部署脚本使用 `migration-locked` 文件防止并发执行
- **`migration_lock.toml` 必须提交到 Git**（记录数据库 provider），**仅 `migration-locked` 不提交**

## 常见操作

| 命令 | 环境 | 用途 |
|---|---|---|
| `prisma migrate dev` | 开发 | 从 schema 生成迁移文件 |
| `prisma migrate deploy` | 生产 | 执行未应用的迁移 |
| `prisma migrate status` | 任意 | 查看迁移状态 |
| `prisma migrate resolve` | 任意 | 手动标记迁移状态（`--applied` / `--rolled-back`） |
| `prisma migrate reset` | 开发 | 重置数据库并重新执行所有迁移 |
| `prisma db push` | 开发 | 直接推送 schema（不生成迁移文件） |
| `prisma db seed` | 任意 | 执行 seed 脚本 |
