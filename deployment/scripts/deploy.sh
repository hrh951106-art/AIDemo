#!/bin/bash

# ===========================================
# 自动部署脚本 - 项目管理系统
# ===========================================
# 使用方法:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
# ===========================================

set -e  # 遇到错误立即退出

# ===========================================
# 配置变量
# ===========================================
APP_NAME="project-management"
APP_DIR="/var/www/project-management-system"
BACKUP_DIR="/var/backups/project-management"
LOG_FILE="/var/log/deploy.log"
DATE=$(date +%Y%m%d_%H%M%S)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# ===========================================
# 检查是否为 root 用户
# ===========================================
if [ "$EUID" -ne 0 ]; then
    error "请使用 sudo 运行此脚本"
fi

log "========================================="
log "开始部署项目: $APP_NAME"
log "========================================="

# ===========================================
# 1. 系统更新
# ===========================================
log "步骤 1/13: 更新系统..."
apt update && apt upgrade -y >> "$LOG_FILE" 2>&1

# ===========================================
# 2. 安装基础工具
# ===========================================
log "步骤 2/13: 安装基础工具..."
apt install -y curl wget git build-essential >> "$LOG_FILE" 2>&1

# ===========================================
# 3. 安装 Node.js 20.x
# ===========================================
log "步骤 3/13: 检查 Node.js..."
if ! command -v node &> /dev/null; then
    log "安装 Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >> "$LOG_FILE" 2>&1
    apt install -y nodejs >> "$LOG_FILE" 2>&1
else
    log "Node.js 已安装: $(node -v)"
fi

# ===========================================
# 4. 安装 PostgreSQL
# ===========================================
log "步骤 4/13: 检查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    log "安装 PostgreSQL..."
    apt install -y postgresql postgresql-contrib >> "$LOG_FILE" 2>&1
    systemctl start postgresql
    systemctl enable postgresql
else
    log "PostgreSQL 已安装"
fi

# ===========================================
# 5. 创建数据库和用户
# ===========================================
log "步骤 5/13: 配置数据库..."

# 生成随机密码
DB_PASSWORD=$(openssl rand -base64 24)
log "数据库密码已生成"

# 保存数据库密码
echo "DB_PASSWORD=$DB_PASSWORD" > "$APP_DIR/.db_password"
chmod 600 "$APP_DIR/.db_password"

# 创建数据库和用户
sudo -u postgres psql <<EOF >> "$LOG_FILE" 2>&1
DROP DATABASE IF EXISTS project_management_prod;
DROP USER IF EXISTS project_user;
CREATE DATABASE project_management_prod;
CREATE USER project_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE project_management_prod TO project_user;
ALTER DATABASE project_management_prod OWNER TO project_user;
\c project_management_prod
GRANT ALL ON SCHEMA public TO project_user;
EOF

log "数据库已创建: project_management_prod"

# ===========================================
# 6. 创建应用目录
# ===========================================
log "步骤 6/13: 创建应用目录..."
mkdir -p "$APP_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p /var/log/pm2

# ===========================================
# 7. 复制项目文件
# ===========================================
log "步骤 7/13: 部署应用文件..."
if [ -d ".git" ]; then
    log "从 Git 仓库部署..."
    cp -r . "$APP_DIR/"
else
    warning "未检测到 Git 仓库，请手动复制文件到 $APP_DIR"
fi

cd "$APP_DIR" || error "无法进入应用目录"

# ===========================================
# 8. 配置环境变量
# ===========================================
log "步骤 8/13: 配置环境变量..."

if [ ! -f ".env.production" ]; then
    cp deployment/.env.production.example .env.production

    # 生成 NEXTAUTH_SECRET
    NEXTAUTH_SECRET=$(openssl rand -base64 32)

    # 读取数据库密码
    source .db_password

    # 替换环境变量
    sed -i "s/CHANGE_THIS_PASSWORD/$DB_PASSWORD/g" .env.production
    sed -i "s/your-domain.com/$(hostname -f)/g" .env.production
    sed -i "s/CHANGE_THIS_SECRET.*$/$NEXTAUTH_SECRET/g" .env.production

    warning "请手动编辑 .env.production 配置 NEXTAUTH_URL"
fi

# ===========================================
# 9. 安装依赖
# ===========================================
log "步骤 9/13: 安装 Node.js 依赖..."
npm ci --only=production >> "$LOG_FILE" 2>&1

# ===========================================
# 10. 数据库迁移
# ===========================================
log "步骤 10/13: 运行数据库迁移..."

# 修改 Prisma schema 为 PostgreSQL
sed -i 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

export DATABASE_URL="postgresql://project_user:$DB_PASSWORD@localhost:5432/project_management_prod"
export DIRECT_URL="postgresql://project_user:$DB_PASSWORD@localhost:5432/project_management_prod"

npx prisma generate >> "$LOG_FILE" 2>&1
npx prisma migrate deploy >> "$LOG_FILE" 2>&1

log "数据库迁移完成"

# ===========================================
# 11. 构建应用
# ===========================================
log "步骤 11/13: 构建 Next.js 应用..."
export NODE_ENV=production
export NEXTAUTH_URL="http://$(hostname -f)"
npm run build >> "$LOG_FILE" 2>&1

# ===========================================
# 12. 安装和配置 PM2
# ===========================================
log "步骤 12/13: 配置 PM2..."

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 >> "$LOG_FILE" 2>&1
fi

# 复制 PM2 配置
cp deployment/ecosystem.config.cjs ecosystem.config.cjs

# 启动应用
pm2 start ecosystem.config.cjs >> "$LOG_FILE" 2>&1
pm2 save >> "$LOG_FILE" 2>&1

# 设置开机自启
pm2 startup systemd -u root --hp /root >> "$LOG_FILE" 2>&1

log "应用已启动"

# ===========================================
# 13. 安装和配置 Nginx
# ===========================================
log "步骤 13/13: 配置 Nginx..."

if ! command -v nginx &> /dev/null; then
    apt install -y nginx >> "$LOG_FILE" 2>&1"
fi

# 复制 Nginx 配置
cp deployment/nginx/project-management.conf /etc/nginx/sites-available/project-management

# 替换域名
sed -i "s/your-domain.com/$(hostname -f)/g" /etc/nginx/sites-available/project-management

# 创建符号链接
ln -sf /etc/nginx/sites-available/project-management /etc/nginx/sites-enabled/

# 删除默认配置
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t >> "$LOG_FILE" 2>&1

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx

# ===========================================
# 14. 配置防火墙
# ===========================================
log "配置防火墙..."

if command -v ufw &> /dev/null; then
    ufw --force enable >> "$LOG_FILE" 2>&1"
    ufw allow ssh >> "$LOG_FILE" 2>&1"
    ufw allow 80/tcp >> "$LOG_FILE" 2>&1"
    ufw allow 443/tcp >> "$LOG_FILE" 2>&1"
    log "防火墙已配置"
fi

# ===========================================
# 完成
# ===========================================
log "========================================="
log "部署完成！"
log "========================================="
log ""
log "应用信息:"
log "  应用目录: $APP_DIR"
log "  应用日志: pm2 logs $APP_NAME"
log "  应用状态: pm2 status"
log ""
log "重要文件:"
log "  环境变量: $APP_DIR/.env.production"
log "  数据库密码: $APP_DIR/.db_password"
log ""
log "下一步:"
log "  1. 编辑 .env.production 配置正确的域名"
log "  2. 获取 SSL 证书: certbot --nginx -d your-domain.com"
log "  3. 重启应用: pm2 restart $APP_NAME"
log ""
warning "请妥善保存数据库密码，位于: $APP_DIR/.db_password"
log "========================================="

# 显示 PM2 状态
sleep 2
pm2 status
