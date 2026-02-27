#!/bin/bash

# ===========================================
# 数据库恢复脚本 - 项目管理系统
# ===========================================
# 使用方法:
#   chmod +x restore.sh
#   ./restore.sh /path/to/backup/db_20240101_120000.sql.gz
# ===========================================

set -e

# ===========================================
# 配置变量
# ===========================================
APP_DIR="/var/www/project-management-system"
LOG_FILE="/var/log/restore.log"

# 数据库配置
DB_NAME="project_management_prod"
DB_USER="project_user"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ===========================================
# 检查参数
# ===========================================
if [ -z "$1" ]; then
    echo -e "${RED}错误: 请指定备份文件路径${NC}"
    echo "使用方法: $0 <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}错误: 备份文件不存在: $BACKUP_FILE${NC}"
    exit 1
fi

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# ===========================================
# 检查是否为 root 用户
# ===========================================
if [ "$EUID" -ne 0 ]; then
    error "请使用 sudo 运行此脚本"
fi

# ===========================================
# 警告提示
# ===========================================
log "========================================="
log "数据库恢复操作"
log "========================================="
warning "此操作将覆盖现有数据库!"
warning "按 Ctrl+C 取消，按 Enter 继续..."
read

# ===========================================
# 1. 停止应用
# ===========================================
log "停止应用..."
pm2 stop project-management || warning "应用未运行"

# ===========================================
# 2. 备份当前数据库
# ===========================================
log "备份当前数据库..."
CURRENT_BACKUP="/var/backups/project-management/before_restore_$(date +%Y%m%d_%H%M%S).sql.gz"

# 读取数据库密码
if [ -f "$APP_DIR/.db_password" ]; then
    source "$APP_DIR/.db_password"
    PGPASSWORD="$DB_PASSWORD"
else
    error "数据库密码文件不存在: $APP_DIR/.db_password"
fi

pg_dump -h localhost -U "$DB_USER" "$DB_NAME" | gzip > "$CURRENT_BACKUP"

if [ $? -eq 0 ]; then
    log "当前数据库已备份到: $CURRENT_BACKUP"
else
    error "备份当前数据库失败"
fi

# ===========================================
# 3. 删除并重建数据库
# ===========================================
log "重建数据库..."

sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF

# ===========================================
# 4. 恢复数据库
# ===========================================
log "恢复数据库从: $BACKUP_FILE"

gunzip -c "$BACKUP_FILE" | psql -h localhost -U "$DB_USER" "$DB_NAME" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log "数据库恢复成功"
else
    error "数据库恢复失败"
fi

# ===========================================
# 5. 运行 Prisma 迁移
# ===========================================
log "运行数据库迁移..."

cd "$APP_DIR" || error "无法进入应用目录"

export DATABASE_URL="postgresql://project_user:$DB_PASSWORD@localhost:5432/$DB_NAME"

npx prisma migrate deploy

# ===========================================
# 6. 重启应用
# ===========================================
log "重启应用..."
pm2 restart project-management

# ===========================================
# 完成
# ===========================================
log "========================================="
log "恢复完成!"
log "========================================="
log "应用状态:"
pm2 status project-management
log "========================================="

exit 0
