#!/bin/bash

# Docker 生产环境构建脚本

set -e

echo "================================================"
echo "Docker 生产环境构建"
echo "================================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查必要工具
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    echo "请先安装 Docker: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo -e "${GREEN}✓ Docker 已安装${NC}"
echo ""

# 步骤 1: 备份当前 schema
echo "步骤 1/5: 备份 Prisma schema..."
if [ -f prisma/schema.prisma ]; then
    cp prisma/schema.prisma prisma/schema.prisma.local-backup
    echo -e "${GREEN}✓ 已备份到 prisma/schema.prisma.local-backup${NC}"
fi
echo ""

# 步骤 2: 更新 schema 为 PostgreSQL
echo "步骤 2/5: 更新 Prisma schema 为 PostgreSQL..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
else
    sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
fi
echo -e "${GREEN}✓ Schema 已更新为 PostgreSQL${NC}"
echo ""

# 步骤 3: 检查环境变量
echo "步骤 3/5: 检查环境变量..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env 文件不存在，创建示例文件${NC}"
    cp .env.example.production .env
    echo -e "${YELLOW}请编辑 .env 文件填入实际值${NC}"
    echo ""
    read -p "是否现在编辑? [y/N]: " edit_env
    if [[ $edit_env =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
fi
echo -e "${GREEN}✓ 环境变量已配置${NC}"
echo ""

# 步骤 4: 构建 Docker 镜像
echo "步骤 4/5: 构建 Docker 镜像..."
echo "这可能需要几分钟..."
docker compose -f docker-compose.prod.yml build
echo -e "${GREEN}✓ Docker 镜像构建完成${NC}"
echo ""

# 步骤 5: 验证构建
echo "步骤 5/5: 验证构建..."
if docker images | grep -q project-management; then
    echo -e "${GREEN}✓ 镜像构建成功${NC}"
else
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi
echo ""

echo "================================================"
echo "✅ 构建完成！"
echo "================================================"
echo ""
echo "下一步："
echo "  启动服务: docker compose -f docker-compose.prod.yml up -d"
echo "  查看日志: docker compose -f docker-compose.prod.yml logs -f"
echo "  运行迁移: docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy"
echo ""
echo -e "${YELLOW}⚠️  注意：${NC}"
echo "1. 构建前 Prisma schema 已更新为 PostgreSQL"
echo "2. 本地开发备份: prisma/schema.prisma.local-backup"
echo "3. 如需恢复本地开发: cp prisma/schema.prisma.local-backup prisma/schema.prisma"
echo ""
