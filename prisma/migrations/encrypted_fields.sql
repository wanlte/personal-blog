-- ==========================================================
-- 敏感数据加密字段 - 数据库迁移脚本
-- 说明：新增加密字段到 users 表 + api_keys 表 + key_rotation_logs 表
-- 加密格式: v{version}:{base64_iv}:{base64_ciphertext}
-- 适用数据库：PostgreSQL
-- ==========================================================

-- 1. users 表新增加密敏感字段
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "id_card" TEXT,
    ADD COLUMN IF NOT EXISTS "bank_card" TEXT,
    ADD COLUMN IF NOT EXISTS "secret_question" TEXT;

COMMENT ON COLUMN "users"."id_card" IS '身份证号（AES-256-CBC 加密存储）';
COMMENT ON COLUMN "users"."bank_card" IS '银行卡号（AES-256-CBC 加密存储）';
COMMENT ON COLUMN "users"."secret_question" IS '密码提示问题（AES-256-CBC 加密存储）';

-- 2. 第三方 API 密钥表
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" SERIAL PRIMARY KEY,
    "service_name" VARCHAR(50) NOT NULL,
    "api_key" TEXT NOT NULL,
    "description" VARCHAR(255),
    "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_keys_service_name_user_id_key" UNIQUE ("service_name", "user_id")
);

CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "api_keys_service_name_idx" ON "api_keys"("service_name");

COMMENT ON TABLE "api_keys" IS '第三方 API 密钥（AES-256-CBC 加密存储）';
COMMENT ON COLUMN "api_keys"."api_key" IS 'API 密钥（AES-256-CBC 加密存储，格式: v{version}:{iv}:{ciphertext}）';

-- 3. 密钥轮换日志表
CREATE TABLE IF NOT EXISTS "key_rotation_logs" (
    "id" SERIAL PRIMARY KEY,
    "old_version" VARCHAR(10) NOT NULL,
    "new_version" VARCHAR(10) NOT NULL,
    "rotated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_by" VARCHAR(100),
    "notes" VARCHAR(500)
);

COMMENT ON TABLE "key_rotation_logs" IS '加密密钥轮换记录';
