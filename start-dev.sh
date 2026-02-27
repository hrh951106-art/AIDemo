#!/bin/bash

# Next.js 开发服务器启动脚本
# 支持远程访问

echo "=========================================="
echo "项目管理系统 - 开发服务器"
echo "=========================================="

# 检查端口
PORT=${PORT:-3000}
echo "端口: $PORT"

# 检查是否已被占用
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用，正在尝试关闭..."
    PIDS=$(lsof -t -i:$PORT)
    if [ -n "$PIDS" ]; then
        kill -9 $PIDS 2>/dev/null
        sleep 2
        echo "✓ 已关闭占用进程"
    fi
fi

# 清理缓存（可选）
echo ""
read -p "是否清理 .next 缓存？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "清理缓存..."
    rm -rf .next
    echo "✓ 缓存已清理"
fi

# 启动开发服务器
echo ""
echo "🚀 启动开发服务器..."
echo "=========================================="
echo ""
echo "访问地址:"
echo "  本机: http://localhost:$PORT"
echo "  网络: http://$(hostname -I | awk '{print $1}'):$PORT"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

# 设置环境变量允许外部访问
export HOSTNAME="0.0.0.0"
export PORT=$PORT

# 启动开发服务器
npm run dev
