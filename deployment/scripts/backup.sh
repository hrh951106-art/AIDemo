#!/bin/bash

# ===========================================
# 数据库备份脚本 - 项目管理系统
# ===========================================
# 使用方法:
#   chmod +x backup.sh
#   ./backup.sh
#
# 添加到定时任务:
#   crontab -e
#   0 2 * * * /path/to/backup.sh
# ===========================================

set -e

# ===========================================
# 配置变量
# ===========================================
BACKUP_DIR="/var/backups/project-management"
APP_DIR="/var/www/project-management-system"
LOG_FILE="/var/log/backup.log"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 数据库配置
DB_NAME="project_management_prod"
DB_USER="project_user"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

# ===========================================
# 检查是否为 root 用户
# ===========================================
if [ "$EUID" -ne 0 ]; then
    error "请使用 sudo 运行此脚本"
fi

log "========================================="
log "开始备份: $DATE"
log "========================================="

# ===========================================
# 1. 创建备份目录
# ===========================================
mkdir -p "$BACKUP_DIR"

# ===========================================
# 2. 备份 PostgreSQL 数据库
# ===========================================
log "备份数据库..."

BACKUP_FILE="$BACKUP_DIR/db_$DATE.sql.gz"

# 读取数据库密码
if [ -f "$APP_DIR/.db_password" ]; then
    source "$APP_DIR/.db_password"
    PGPASSWORD="$DB_PASSWORD"
else
    error "数据库密码文件不存在: $APP_DIR/.db_password"
fi

# 执行备份
pg_dump -h localhost -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "数据库备份成功: $BACKUP_FILE ($SIZE)"
else
    error "数据库备份失败"
fi

# ===========================================
# 3. 备份环境变量文件
# ===========================================
log "备份环境变量..."

cp "$APP_DIR/.env.production" "$BACKUP_DIR/env_$DATE.backup"

if [ $? -eq 0 ]; then
    log "环境变量备份成功"
else
    error "环境变量备份失败"
fi

# ===========================================
# 4. 备份上传的文件 (如果有)
# ===========================================
if [ -d "$APP_DIR/public/uploads" ]; then
    log "备份上传文件..."

    UPLOADS_BACKUP="$BACKUP_DIR/uploads_$DATE.tar.gz"
    tar -czf "$UPLOADS_BACKUP" -C "$APP_DIR/public" uploads

    if [ $? -eq 0 ]; then
        SIZE=$(du -h "$UPLOADS_BACKUP" | cut -f1)
        log "上传文件备份成功: $UPLOADS_BACKUP ($SIZE)"
    fi
fi

# ===========================================
# 5. 清理旧备份
# ===========================================
log "清理 $RETENTION_DAYS 天前的备份..."

# 清理数据库备份
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# 清理环境变量备份
find "$BACKUP_DIR" -name "env_*.backup" -mtime +$RETENTION_DAYS -delete

# 清理上传文件备份
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete

log "旧备份已清理"

# ===========================================
# 6. 生成备份报告
# ===========================================
log ""
log "========================================="
log "备份完成: $DATE"
log "========================================="
log ""
log "备份文件:"
log "  数据库: $BACKUP_FILE"
ls -lh "$BACKUP_FILE" | awk '{print "    大小: " $5}'
log "  环境变量: $BACKUP_DIR/env_$DATE.backup"
log ""
log "磁盘使用:"
df -h "$BACKUP_DIR" | tail -n 1 | awk '{print "    已用: " $3 " / " $2 " (" $5 ")"}'
log ""
log "下次清理: $(date -d "+$RETENTION_DAYS days" '+%Y-%m-%d')"
log "========================================="

# ===========================================
# 7. 可选: 上传到远程服务器 (示例)
# ===========================================
# 取消注释以下代码以启用远程备份
#
# log "上传到远程服务器..."
# scp "$BACKUP_FILE" user@remote-server:/backups/
#
# if [ $? -eq 0 ]; then
#     log "远程备份成功"
# fi

exit 0
