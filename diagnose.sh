#!/bin/bash

# 项目管理系统 - 404 错误诊断脚本

echo "=========================================="
echo "404 错误诊断工具"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查 Node.js 进程
echo "1️⃣  检查 Node.js 进程..."
if pgrep -x "node" > /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js 进程正在运行"
    ps aux | grep node | grep -v grep
else
    echo -e "${RED}✗${NC} Node.js 进程未运行"
fi
echo ""

# 2. 检查端口 3000
echo "2️⃣  检查端口 3000..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 端口 3000 已被占用"
    lsof -i :3000
else
    echo -e "${RED}✗${NC} 端口 3000 未被监听"
fi
echo ""

# 3. 测试 HTTP 连接
echo "3️⃣  测试 HTTP 连接..."
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓${NC} 根路径返回 200 OK"
    elif [ "$HTTP_CODE" = "404" ]; then
        echo -e "${RED}✗${NC} 根路径返回 404 Not Found"
        echo -e "${YELLOW}可能的原因:${NC}"
        echo "  - 应用未正确构建"
        echo "  - 路由配置问题"
        echo "  - 静态文件缺失"
    else
        echo -e "${YELLOW}⚠${NC} 根路径返回: $HTTP_CODE"
    fi
    
    # 测试 API 端点
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
    echo "   /api/health 返回: $API_CODE"
else
    echo -e "${YELLOW}⚠${NC} curl 未安装，跳过 HTTP 测试"
fi
echo ""

# 4. 检查应用文件
echo "4️⃣  检查应用文件结构..."
DEPLOY_DIR="/opt/project-management-system"
if [ -d "$DEPLOY_DIR" ]; then
    echo -e "${GREEN}✓${NC} 部署目录存在: $DEPLOY_DIR"
    
    # 检查关键文件
    if [ -d "$DEPLOY_DIR/.next" ]; then
        echo -e "  ${GREEN}✓${NC} .next 目录存在"
    else
        echo -e "  ${RED}✗${NC} .next 目录缺失"
    fi
    
    if [ -d "$DEPLOY_DIR/public" ]; then
        echo -e "  ${GREEN}✓${NC} public 目录存在"
        if [ -d "$DEPLOY_DIR/public/fonts" ]; then
            FONT_COUNT=$(ls -1 $DEPLOY_DIR/public/fonts/*.woff2 2>/dev/null | wc -l)
            echo -e "    ${GREEN}✓${NC} fonts 目录存在 ($FONT_COUNT 个字体文件)"
        else
            echo -e "    ${RED}✗${NC} fonts 目录缺失"
        fi
    else
        echo -e "  ${RED}✗${NC} public 目录缺失"
    fi
    
    if [ -d "$DEPLOY_DIR/node_modules" ]; then
        echo -e "  ${GREEN}✓${NC} node_modules 目录存在"
    else
        echo -e "  ${RED}✗${NC} node_modules 目录缺失"
    fi
else
    echo -e "${RED}✗${NC} 部署目录不存在: $DEPLOY_DIR"
    echo -e "  ${YELLOW}请先运行部署脚本: ./deploy-production.sh${NC}"
fi
echo ""

# 5. 检查环境变量
echo "5️⃣  检查环境变量..."
if [ -f "$DEPLOY_DIR/.env" ]; then
    echo -e "${GREEN}✓${NC} .env 文件存在"
    
    if grep -q "DATABASE_URL" $DEPLOY_DIR/.env; then
        echo -e "  ${GREEN}✓${NC} DATABASE_URL 已配置"
    else
        echo -e "  ${RED}✗${NC} DATABASE_URL 未配置"
    fi
    
    if grep -q "NEXTAUTH_URL" $DEPLOY_DIR/.env; then
        echo -e "  ${GREEN}✓${NC} NEXTAUTH_URL 已配置"
        NEXTAUTH_URL=$(grep "NEXTAUTH_URL=" $DEPLOY_DIR/.env | cut -d'=' -f2)
        echo -e "    值: $NEXTAUTH_URL"
        if [[ "$NEXTAUTH_URL" == *"localhost"* ]]; then
            echo -e "    ${YELLOW}⚠️  使用 localhost，生产环境请修改为实际域名${NC}"
        fi
    else
        echo -e "  ${RED}✗${NC} NEXTAUTH_URL 未配置"
    fi
    
    if grep -q "NEXTAUTH_SECRET" $DEPLOY_DIR/.env; then
        NEXTAUTH_SECRET=$(grep "NEXTAUTH_SECRET=" $DEPLOY_DIR/.env | cut -d'=' -f2)
        if [ "$NEXTAUTH_SECRET" = "please-change-this-to-a-random-secret" ] || [ -z "$NEXTAUTH_SECRET" ]; then
            echo -e "  ${RED}✗${NC} NEXTAUTH_SECRET 使用默认值或为空，请修改！"
        else
            echo -e "  ${GREEN}✓${NC} NEXTAUTH_SECRET 已配置"
        fi
    else
        echo -e "  ${RED}✗${NC} NEXTAUTH_SECRET 未配置"
    fi
else
    echo -e "${RED}✗${NC} .env 文件不存在"
fi
echo ""

# 6. 检查 PostgreSQL
echo "6️⃣  检查 PostgreSQL 数据库..."
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} PostgreSQL 客户端已安装"
    
    if systemctl is-active --quiet postgresql; then
        echo -e "  ${GREEN}✓${NC} PostgreSQL 服务正在运行"
    else
        echo -e "  ${RED}✗${NC} PostgreSQL 服务未运行"
    fi
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL 客户端未安装"
fi
echo ""

# 7. 检查系统日志
echo "7️⃣  最近的应用日志..."
if [ -f "/var/log/journal/project-management" ] || systemctl is-active --quiet project-management; then
    echo "最近的错误日志:"
    journalctl -u project-management -n 20 --no-pager | grep -i error || echo "无错误日志"
else
    echo -e "${YELLOW}⚠${NC} 未找到系统服务日志"
fi
echo ""

# 8. 提供修复建议
echo "=========================================="
echo "📋 诊断总结"
echo "=========================================="
echo ""
echo "根据以上检查结果，可能的解决方案："
echo ""
echo "1️⃣  重新部署应用:"
echo "   sudo ./deploy-production.sh"
echo ""
echo "2️⃣  重启服务:"
echo "   sudo systemctl restart project-management"
echo ""
echo "3️⃣  查看完整日志:"
echo "   sudo journalctl -u project-management -f"
echo ""
echo "4️⃣  检查构建文件:"
echo "   ls -la /opt/project-management-system/.next/"
echo ""
echo "5️⃣  测试本地连接:"
echo "   curl http://localhost:3000/api/health"
echo ""
