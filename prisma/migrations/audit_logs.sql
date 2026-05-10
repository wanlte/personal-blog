-- ==========================================================
-- 操作审计日志系统 - 数据库迁移脚本
-- 说明：通用操作审计日志表，记录所有写操作的变更历史
-- 适用数据库：PostgreSQL
-- ==========================================================

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "action" VARCHAR(50) NOT NULL,
    "resource_type" VARCHAR(30) NOT NULL,
    "resource_id" VARCHAR(50),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_idx" ON "audit_logs"("resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

COMMENT ON TABLE "audit_logs" IS '操作审计日志（记录所有写操作的变更历史）';
COMMENT ON COLUMN "audit_logs"."action" IS '操作类型: USER_LOGIN | USER_REGISTER | ARTICLE_CREATE | ARTICLE_UPDATE | ARTICLE_DELETE | COMMENT_CREATE | COMMENT_DELETE | SETTINGS_UPDATE | ADMIN_* 等';
COMMENT ON COLUMN "audit_logs"."resource_type" IS '资源类型: user | article | comment | settings';
COMMENT ON COLUMN "audit_logs"."old_value" IS '变更前的数据快照（JSONB）';
COMMENT ON COLUMN "audit_logs"."new_value" IS '变更后的数据快照（JSONB）';
COMMENT ON COLUMN "audit_logs"."duration" IS '请求耗时（毫秒）';
