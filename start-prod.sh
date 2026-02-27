#!/bin/bash

# Next.js 生产服务器启动脚本

echo "=========================================="
echo "项目管理系统 - 生产服务器"
echo "=========================================="

# 检查是否已构建
if [ ! -d ".next" ]; then
    echo "❌ 未找到构建产物，请先运行: npm run build"
    exit 1
fi

# 配置
PORT=${PORT:-3000}
HOSTNAME=${HOSTNAME:-0.0.0.0}

echo "端口: $PORT"
echo "监听: $HOSTNAME"
echo ""

# 检查端口
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用"
    PIDS=$(lsof -t -i:$PORT)
    echo "占用进程: $PIDS"
    read -p "是否关闭？(y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PIDS 2>/dev/null
        sleep 2
        echo "✓ 已关闭"
    else
        echo "启动取消"
        exit 1
    fi
fi

# 启动生产服务器
echo ""
echo "🚀 启动生产服务器..."
echo "=========================================="
echo ""
echo "访问地址:"
echo "  本机: http://localhost:$PORT"
echo "  网络: http://$(hostname -I | awk '{print $1}'):$PORT"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

# 设置环境变量
export NODE_ENV=production
export HOSTNAME=$HOSTNAME
export PORT=$PORT
export HOSTNAME="0.0.0.0"

# 启动
npm start
