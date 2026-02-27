#!/bin/bash

# 项目管理系统部署脚本
# 适用于 Alibaba Cloud Linux 3

set -e

echo "======================================"
echo "项目管理系统 - 生产环境部署"
echo "======================================"

# 1. 检查Node.js版本
echo "1. 检查Node.js版本..."
NODE_VERSION=$(node -v)
echo "当前Node.js版本: $NODE_VERSION"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    echo "请先安装Node.js 18.x或更高版本"
    exit 1
fi

# 2. 安装依赖
echo "2. 安装项目依赖..."
rm -rf node_modules package-lock.json
npm install

# 3. 生成Prisma Client
echo "3. 生成Prisma Client..."
npx prisma generate

# 4. 运行数据库迁移（如果需要）
echo "4. 运行数据库迁移..."
npx prisma migrate deploy

# 5. 构建项目
echo "5. 构建生产版本..."
npm run build

# 6. 设置环境变量
echo "6. 配置环境变量..."
if [ ! -f .env.production ]; then
    echo "⚠️  警告: .env.production 文件不存在"
    echo "请创建 .env.production 文件并配置以下变量:"
    echo "  DATABASE_URL"
    echo "  NEXTAUTH_URL"
    echo "  NEXTAUTH_SECRET"
    exit 1
fi

# 7. 启动应用
echo "7. 启动应用..."
echo "使用PM2启动: pm2 start npm --name 'project-management' -- start"
echo "或直接运行: npm run start"

echo "======================================"
echo "部署完成！"
echo "======================================"
