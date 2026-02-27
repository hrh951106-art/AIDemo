#!/bin/bash

# Docker 生产环境部署脚本 - PostgreSQL 版本
# 此脚本用于部署生产环境，使用 PostgreSQL 数据库

set -e

echo "================================================"
echo "项目管理系统 - Docker 生产环境部署"
echo "================================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查必要工具
echo "🔍 检查必要工具..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "请先安装 Docker: https://www.docker.com/products/docker-desktop/"
    exit 1
fi
echo -e "${GREEN}✓ Docker 已安装${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose 已安装${NC}"

echo ""

# 步骤 1: 配置环境变量
echo "================================================"
echo "步骤 1/6: 配置环境变量"
echo "================================================"
echo ""

# 复制生产环境配置
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production 文件不存在${NC}"
    exit 1
fi

# 读取配置
read -p "请输入域名 (如: http://your-domain.com): " domain
read -sp "请输入数据库密码: " db_password
echo ""
read -sp "请输入 NEXTAUTH_SECRET (随机字符串): " auth_secret
echo ""

# 创建临时配置文件用于部署
cat > .env.prod.deploy << EOF
# 数据库 (PostgreSQL)
DATABASE_URL="postgresql://postgres:$db_password@postgres:5432/project_management?schema=public"
DIRECT_URL="postgresql://postgres:$db_password@postgres:5432/project_management?schema=public"

# NextAuth
NEXTAUTH_URL="$domain"
NEXTAUTH_SECRET="$auth_secret"

# 应用配置
NODE_ENV="production"
EOF

echo -e "${GREEN}✓ 环境变量已配置${NC}"
echo ""

# 步骤 2: 更新 Prisma Schema
echo "================================================"
echo "步骤 2/6: 更新 Prisma Schema"
echo "================================================"
echo ""

# 备份当前 schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# 更新为 PostgreSQL
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
else
    sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
fi

echo -e "${GREEN}✓ Prisma Schema 已更新为 PostgreSQL${NC}"
echo ""

# 步骤 3: 构建 Docker 镜像
echo "================================================"
echo "步骤 3/6: 构建 Docker 镜像"
echo "================================================"
echo ""

# 使用临时配置构建
docker-compose -f docker-compose.prod.yml --env-file .env.prod.deploy build
echo -e "${GREEN}✓ Docker 镜像构建完成${NC}"
echo ""

# 步骤 4: 启动 PostgreSQL
echo "================================================"
echo "步骤 4/6: 启动 PostgreSQL 数据库"
echo "================================================"
echo ""

# 更新 docker-compose.yml 使用新的环境变量
cat > docker-compose.prod.yml << EOF
services:
  postgres:
    image: postgres:16-alpine
    container_name: project-management-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: $db_password
      POSTGRES_DB: project_management
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: project-management-app
    restart: always
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:$db_password@postgres:5432/project_management?schema=public
      DIRECT_URL: postgresql://postgres:$db_password@postgres:5432/project_management?schema=public
      NEXTAUTH_URL: $domain
      NEXTAUTH_SECRET: $auth_secret
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app-network

volumes:
  postgres_data:
    driver: local

networks:
  app-network:
    driver: bridge
EOF

# 先只启动数据库
docker-compose -f docker-compose.prod.yml up -d postgres

# 等待数据库启动
echo "等待数据库启动..."
for i in {1..30}; do
    if docker exec project-management-postgres pg_isready -U postgres &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL 已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# 步骤 5: 运行数据库迁移
echo "================================================"
echo "步骤 5/6: 运行数据库迁移"
echo "================================================"
echo ""

# 在应用容器中运行迁移
docker-compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker-compose -f docker-compose.prod.yml run --rm app npx prisma generate

echo -e "${GREEN}✓ 数据库迁移完成${NC}"
echo ""

# 步骤 6: 启动应用
echo "================================================"
echo "步骤 6/6: 启动应用"
echo "================================================"
echo ""

# 启动完整的应用
docker-compose -f docker-compose.prod.yml up -d

# 等待应用启动
echo "等待应用启动..."
sleep 5

# 检查应用状态
if docker ps | grep -q project-management-app; then
    echo -e "${GREEN}✓ 应用已启动${NC}"
else
    echo -e "${RED}❌ 应用启动失败${NC}"
    docker-compose -f docker-compose.prod.yml logs app
    exit 1
fi

echo ""
echo "================================================"
echo "🎉 部署完成！"
echo "================================================"
echo ""
echo "应用信息："
echo "  🌐 URL: $domain"
echo "  📊 数据库: PostgreSQL (localhost:5432)"
echo "  🐳 容器状态: docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "常用命令："
echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "  停止服务: docker-compose -f docker-compose.prod.yml down"
echo "  重启服务: docker-compose -f docker-compose.prod.yml restart"
echo "  数据库备份: ./backup-production-db.sh"
echo ""
echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo "1. 部署配置已保存到 docker-compose.prod.yml"
echo "2. 生产环境密码已设置，请妥善保管"
echo "3. 建议定期备份数据库"
echo "4. 原 Prisma schema 已备份到 prisma/schema.prisma.backup"
echo ""
