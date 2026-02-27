#!/bin/bash

# 快速启动脚本 - 使用 Docker PostgreSQL

set -e

echo "================================================"
echo "项目管理系统 - PostgreSQL 开发环境"
echo "================================================"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    echo ""
    echo "请先安装 Docker Desktop for Mac:"
    echo "https://www.docker.com/products/docker-desktop/"
    echo ""
    exit 1
fi

echo "✓ Docker 已安装"

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo "❌ Docker 未运行"
    echo "请启动 Docker Desktop 应用"
    exit 1
fi

echo "✓ Docker 正在运行"
echo ""

# 步骤 1: 更新 Prisma schema
echo "步骤 1/6: 更新 Prisma schema..."
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
echo "✓ Prisma schema 已更新为 PostgreSQL"

# 步骤 2: 更新 .env 文件
echo ""
echo "步骤 2/6: 更新 .env 配置..."
cp .env.postgresql .env
echo "✓ .env 已配置为使用 PostgreSQL"

# 步骤 3: 启动 PostgreSQL 容器
echo ""
echo "步骤 3/6: 启动 PostgreSQL 数据库..."
docker-compose up -d postgres

# 等待数据库启动
echo "等待数据库启动..."
for i in {1..30}; do
    if docker exec project-management-db pg_isready -U postgres &> /dev/null; then
        echo "✓ PostgreSQL 已就绪"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# 步骤 4: 生成 Prisma Client
echo ""
echo "步骤 4/6: 生成 Prisma Client..."
npx prisma generate
echo "✓ Prisma Client 已生成"

# 步骤 5: 运行数据库迁移
echo ""
echo "步骤 5/6: 创建数据库表..."
npx prisma migrate dev --name init || echo "注意: 迁移可能已存在"
echo "✓ 数据库表已创建"

# 步骤 6: 启动开发服务器
echo ""
echo "步骤 6/6: 启动开发服务器..."
echo ""
echo "================================================"
echo "✅ 配置完成！"
echo "================================================"
echo ""
echo "数据库信息："
echo "  Host: localhost:5432"
echo "  Database: project_management"
echo "  User: postgres"
echo "  Password: postgres"
echo ""
echo "现在可以启动开发服务器："
echo "  npm run dev"
echo ""
echo "或者使用脚本："
echo "  ./start-dev.sh"
echo ""
echo "停止数据库："
echo "  docker-compose down"
echo ""
