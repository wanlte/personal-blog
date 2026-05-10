-- ==========================================================
-- 管理后台系统 - 数据库迁移脚本
-- 说明：管理员角色系统 + 操作日志 + 系统配置表 + 评论状态
-- 适用数据库：PostgreSQL
-- ==========================================================

-- 1. users 表新增加管理员字段
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "role" VARCHAR(30);

COMMENT ON COLUMN "users"."is_admin" IS '是否为管理员';
COMMENT ON COLUMN "users"."role" IS '管理员角色: super_admin | content_admin | analyst';

-- 2. comments 表新增加审核状态字段
ALTER TABLE "comments"
    ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'approved';

COMMENT ON COLUMN "comments"."status" IS '评论状态: approved | pending';

-- 3. 管理员操作日志表
CREATE TABLE IF NOT EXISTS "admin_logs" (
    "id" SERIAL PRIMARY KEY,
    "admin_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "action" VARCHAR(50) NOT NULL,
    "target" VARCHAR(100),
    "details" TEXT,
    "ip" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "admin_logs_admin_id_idx" ON "admin_logs"("admin_id");
CREATE INDEX IF NOT EXISTS "admin_logs_action_idx" ON "admin_logs"("action");
CREATE INDEX IF NOT EXISTS "admin_logs_created_at_idx" ON "admin_logs"("created_at");

COMMENT ON TABLE "admin_logs" IS '管理员操作日志';
COMMENT ON COLUMN "admin_logs"."action" IS '操作类型: login | update_article | delete_article | promote_admin | update_user | delete_user | delete_comment | update_settings | create_admin';

-- 4. 系统配置表（键值存储）
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" SERIAL PRIMARY KEY,
    "key" VARCHAR(100) NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "system_settings" IS '系统配置键值存储';
