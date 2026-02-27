-- ===========================================
-- PostgreSQL 初始化脚本
-- ===========================================
-- 此文件在 Docker 容器首次启动时自动执行
-- ===========================================

-- 创建扩展 (如果需要)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于模糊搜索

-- 设置时区
SET timezone = 'UTC';

-- 创建索引 (Prisma 迁移会自动创建，这里只是示例)
-- CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email);
-- CREATE INDEX IF NOT EXISTS idx_task_status ON "Task"(status);
-- CREATE INDEX IF NOT EXISTS idx_task_assigned_user ON "Task"("assignedUserId");

-- 优化设置
ALTER DATABASE project_management_prod SET shared_preload_libraries = 'pg_stat_statements';

-- 设置连接数
ALTER DATABASE project_management_prod SET max_connections = 100;

-- ===========================================
-- 说明
# ===========================================
# 此脚本由 docker-compose 自动执行
# 手动部署时无需使用此文件
# ===========================================
