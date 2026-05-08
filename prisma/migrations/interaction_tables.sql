-- ==========================================================
-- 用户互动功能 - 数据库迁移脚本
-- 说明：新增 article_likes、article_collections、user_follows 表
-- 以及 article 表的新增字段
-- 适用数据库：PostgreSQL
-- ==========================================================

-- 1. 文章点赞表
CREATE TABLE IF NOT EXISTS "article_likes" (
    "id" SERIAL PRIMARY KEY,
    "article_id" INTEGER NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "article_likes_article_id_user_id_key" UNIQUE ("article_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "article_likes_article_id_idx" ON "article_likes"("article_id");
CREATE INDEX IF NOT EXISTS "article_likes_user_id_idx" ON "article_likes"("user_id");

COMMENT ON TABLE "article_likes" IS '文章点赞记录';
COMMENT ON COLUMN "article_likes"."article_id" IS '被点赞的文章ID';
COMMENT ON COLUMN "article_likes"."user_id" IS '点赞用户ID';

-- 2. 文章收藏表
CREATE TABLE IF NOT EXISTS "article_collections" (
    "id" SERIAL PRIMARY KEY,
    "article_id" INTEGER NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
    "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "article_collections_article_id_user_id_key" UNIQUE ("article_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "article_collections_article_id_idx" ON "article_collections"("article_id");
CREATE INDEX IF NOT EXISTS "article_collections_user_id_idx" ON "article_collections"("user_id");

COMMENT ON TABLE "article_collections" IS '文章收藏记录';
COMMENT ON COLUMN "article_collections"."article_id" IS '被收藏的文章ID';
COMMENT ON COLUMN "article_collections"."user_id" IS '收藏用户ID';

-- 3. 用户关注表
CREATE TABLE IF NOT EXISTS "user_follows" (
    "id" SERIAL PRIMARY KEY,
    "follower_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "following_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id")
);

CREATE INDEX IF NOT EXISTS "user_follows_follower_id_idx" ON "user_follows"("follower_id");
CREATE INDEX IF NOT EXISTS "user_follows_following_id_idx" ON "user_follows"("following_id");

COMMENT ON TABLE "user_follows" IS '用户关注关系';
COMMENT ON COLUMN "user_follows"."follower_id" IS '关注者（主动关注方）';
COMMENT ON COLUMN "user_follows"."following_id" IS '被关注者';

-- 4. 文章表新增字段（付费功能相关，如果尚未添加）
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "is_paid" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN "articles"."is_paid" IS '是否付费文章：0=免费 1=付费';
COMMENT ON COLUMN "articles"."price" IS '付费文章价格';

-- 5. 评论表新增 parent_id（嵌套回复支持，如果尚未添加）
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "parent_id" INTEGER REFERENCES "comments"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "comments_parent_id_idx" ON "comments"("parent_id");
COMMENT ON COLUMN "comments"."parent_id" IS '父评论ID，用于嵌套回复';

-- ==========================================================
-- 回滚脚本（如需撤销本次迁移）：
-- DROP TABLE IF EXISTS "article_likes";
-- DROP TABLE IF EXISTS "article_collections";
-- DROP TABLE IF EXISTS "user_follows";
-- ALTER TABLE "articles" DROP COLUMN IF EXISTS "is_paid";
-- ALTER TABLE "articles" DROP COLUMN IF EXISTS "price";
-- ALTER TABLE "comments" DROP COLUMN IF EXISTS "parent_id";
-- ==========================================================
