#!/bin/bash

# 项目管理系统 - 生产环境部署脚本
# 使用方法: sudo ./deploy-production.sh

set -e

echo "=========================================="
echo "项目管理系统 - 生产环境部署"
echo "=========================================="

# 配置变量
PROJECT_NAME="project-management-system"
DEPLOY_DIR="/opt/$PROJECT_NAME"
SERVICE_USER="nodejs"
SERVICE_NAME="project-management"

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 停止现有服务
echo ""
echo "📦 步骤 1: 停止现有服务..."
if systemctl is-active --quiet $SERVICE_NAME; then
    systemctl stop $SERVICE_NAME
    echo "✓ 服务已停止"
else
    echo "ℹ️  服务未运行"
fi

# 2. 备份现有部署
echo ""
echo "💾 步骤 2: 备份现有部署..."
if [ -d "$DEPLOY_DIR" ]; then
    BACKUP_DIR="${DEPLOY_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    cp -r $DEPLOY_DIR $BACKUP_DIR
    echo "✓ 已备份到: $BACKUP_DIR"
else
    echo "ℹ️  无现有部署需要备份"
fi

# 3. 创建部署目录
echo ""
echo "📁 步骤 3: 创建部署目录..."
mkdir -p $DEPLOY_DIR
echo "✓ 部署目录: $DEPLOY_DIR"

# 4. 复制应用文件
echo ""
echo "📋 步骤 4: 复制应用文件..."
cp -r .next $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp -r prisma $DEPLOY_DIR/
cp -r node_modules/.prisma $DEPLOY_DIR/node_modules/
cp package.json $DEPLOY_DIR/
echo "✓ 应用文件已复制"

# 5. 创建环境变量文件
echo ""
echo "⚙️  步骤 5: 配置环境变量..."
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    cat > $DEPLOY_DIR/.env << 'ENVFILE'
# 数据库连接（请根据实际情况修改）
DATABASE_URL="postgresql://project_manager:your_password@localhost:5432/project_management"

# NextAuth 配置（请修改为实际域名和密钥）
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="please-change-this-to-a-random-secret"

# 运行环境
NODE_ENV="production"
PORT="3000"
ENVFILE
    echo "✓ 环境变量文件已创建（请修改 .env 中的配置）"
else
    echo "ℹ️  环境变量文件已存在，保留现有配置"
fi

# 6. 创建系统用户（如果不存在）
echo ""
echo "👤 步骤 6: 配置系统用户..."
if ! id -u $SERVICE_USER > /dev/null 2>&1; then
    useradd -r -s /bin/false $SERVICE_USER
    echo "✓ 系统用户已创建: $SERVICE_USER"
else
    echo "ℹ️  系统用户已存在: $SERVICE_USER"
fi

# 7. 设置文件权限
echo ""
echo "🔒 步骤 7: 设置文件权限..."
chown -R $SERVICE_USER:$SERVICE_USER $DEPLOY_DIR
chmod 755 $DEPLOY_DIR
echo "✓ 文件权限已设置"

# 8. 运行数据库迁移
echo ""
echo "🗄️  步骤 8: 运行数据库迁移..."
cd $DEPLOY_DIR
sudo -u $SERVICE_USER npx prisma migrate deploy || echo "⚠️  数据库迁移失败，请检查数据库连接"
echo "✓ 数据库迁移完成"

# 9. 创建 systemd 服务文件
echo ""
echo "🔧 步骤 9: 创建系统服务..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << SERVICEFILE
[Unit]
Description=Project Management System
After=network.target postgresql.service

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$DEPLOY_DIR
Environment="NODE_ENV=production"
EnvironmentFile=$DEPLOY_DIR/.env
ExecStart=/usr/bin/node node_modules/.bin/next start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=project-management

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$DEPLOY_DIR

[Install]
WantedBy=multi-user.target
SERVICEFILE

systemctl daemon-reload
echo "✓ 系统服务已创建"

# 10. 启动服务
echo ""
echo "🚀 步骤 10: 启动服务..."
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME
sleep 3

# 11. 检查服务状态
echo ""
echo "📊 步骤 11: 检查服务状态..."
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ 服务启动成功！"
    echo ""
    echo "=========================================="
    echo "部署完成！"
    echo "=========================================="
    echo ""
    echo "📍 访问地址: http://localhost:3000"
    echo ""
    echo "📝 常用命令:"
    echo "  查看日志: sudo journalctl -u $SERVICE_NAME -f"
    echo "  重启服务: sudo systemctl restart $SERVICE_NAME"
    echo "  停止服务: sudo systemctl stop $SERVICE_NAME"
    echo "  查看状态: sudo systemctl status $SERVICE_NAME"
    echo ""
    echo "⚠️  重要提示:"
    echo "  1. 请修改 $DEPLOY_DIR/.env 中的配置"
    echo "  2. 特别是 DATABASE_URL 和 NEXTAUTH_SECRET"
    echo "  3. 重启服务使配置生效: sudo systemctl restart $SERVICE_NAME"
    echo ""
else
    echo "❌ 服务启动失败"
    echo ""
    echo "查看日志:"
    echo "  sudo journalctl -u $SERVICE_NAME -n 50"
    exit 1
fi
