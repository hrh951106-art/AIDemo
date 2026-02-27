#!/bin/bash

# 生产数据库恢复脚本

set -e

echo "================================================"
echo "PostgreSQL 生产数据库恢复"
echo "================================================"
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo "用法: $0 <备份文件路径>"
    echo ""
    echo "可用的备份文件:"
    ls -lt ./backups/*.sql.gz 2>/dev/null | head -10 || echo "暂无备份文件"
    exit 1
fi

BACKUP_FILE=$1

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

echo "警告: 此操作将覆盖当前数据库！"
echo "备份文件: $BACKUP_FILE"
echo ""
read -p "确定要继续吗? [yes/NO]: " confirm

if [ "$confirm" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

# 解压备份文件
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "解压备份文件..."
    TEMP_SQL=$(mktemp)
    gunzip -c "$BACKUP_FILE" > $TEMP_SQL
    BACKUP_TO_RESTORE=$TEMP_SQL
else
    BACKUP_TO_RESTORE=$BACKUP_FILE
fi

# 恢复数据库
echo "开始恢复数据库..."
docker exec -i project-management-postgres psql -U postgres -d project_management < $BACKUP_TO_RESTORE

# 清理临时文件
if [ -f "$TEMP_SQL" ]; then
    rm $TEMP_SQL
fi

echo ""
echo "✓ 数据库恢复完成！"
