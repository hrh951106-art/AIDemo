#!/bin/bash

# 生产数据库备份脚本

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/production_backup_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

echo "================================================"
echo "PostgreSQL 生产数据库备份"
echo "================================================"
echo ""

# 检查容器是否运行
if ! docker ps | grep -q project-management-postgres; then
    echo "❌ PostgreSQL 容器未运行"
    exit 1
fi

echo "开始备份..."
echo "备份文件: $BACKUP_FILE"

# 执行备份
docker exec project-management-postgres pg_dump -U postgres project_management > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

echo ""
echo "✓ 备份完成！"
echo "  备份文件: ${BACKUP_FILE}.gz"
echo ""

# 列出最近5个备份
echo "最近的备份文件:"
ls -lt $BACKUP_DIR/*.sql.gz 2>/dev/null | head -5 || echo "暂无备份文件"
