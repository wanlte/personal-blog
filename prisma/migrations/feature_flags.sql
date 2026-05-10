-- 特性开关配置表（灰度发布 / Feature Flags）
CREATE TABLE IF NOT EXISTS feature_flags (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    percentage  INTEGER DEFAULT 0,
    "userIds"   JSONB DEFAULT '[]'::jsonb,
    roles       VARCHAR(200),
    start_date  TIMESTAMPTZ,
    end_date    TIMESTAMPTZ,
    updated_by  INTEGER,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 种子数据（可选）：从 config/features.js 静态配置同步到数据库
-- INSERT INTO feature_flags (name, enabled, percentage, "userIds", roles, start_date, end_date)
-- VALUES
--   ('NEW_ARTICLE_EDITOR',   true,  10, '[]',     NULL, NULL, NULL),
--   ('ADVANCED_ANALYTICS',   true,  0,  '["admin"]', NULL, NULL, NULL),
--   ('PAYMENT_V2',           false, 0,  '[]',     NULL, '2026-06-01T00:00:00Z', NULL)
-- ON CONFLICT (name) DO NOTHING;
