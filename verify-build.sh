#!/bin/bash

# 构建验证脚本

echo "================================================"
echo "生产构建验证"
echo "================================================"
echo ""

# 步骤 1: 清理旧构建
echo "步骤 1/4: 清理旧构建..."
rm -rf .next
echo "✓ 已清理"
echo ""

# 步骤 2: 运行构建
echo "步骤 2/4: 运行构建..."
if npm run build 2>&1 | tee build.log; then
    echo ""
    echo "✓ 构建成功"
else
    echo ""
    echo "❌ 构建失败"
    echo "查看完整错误: cat build.log"
    exit 1
fi
echo ""

# 步骤 3: 检查构建输出
echo "步骤 3/4: 检查构建输出..."

if [ ! -f .next/BUILD_ID ]; then
    echo "❌ BUILD_ID 文件不存在"
    exit 1
fi
echo "✓ BUILD_ID: $(cat .next/BUILD_ID)"

if [ ! -d .next/standalone ]; then
    echo "❌ standalone 目录不存在"
    exit 1
fi
echo "✓ standalone 目录存在"

if [ ! -f .next/standalone/server.js ]; then
    echo "❌ server.js 不存在"
    exit 1
fi
echo "✓ server.js 存在"

# 统计路由
ROUTES=$(grep -c "├\|└" build.log || echo "0")
echo "✓ 路由数量: $ROUTES"
echo ""

# 步骤 4: 检查是否有错误或警告
echo "步骤 4/4: 检查错误和警告..."

if grep -q "Failed to compile" build.log; then
    echo "❌ 发现编译错误"
    echo "错误详情:"
    grep -A 10 "Type error" build.log
    exit 1
fi
echo "✓ 无编译错误"

if grep -q "Type error" build.log; then
    echo "⚠️  发现类型错误"
    grep "Type error" build.log
fi

echo ""
echo "================================================"
echo "✅ 构建验证完成！"
echo "================================================"
echo ""
echo "构建输出:"
echo "  .next/           - $(du -sh .next/ | cut -f1)"
echo "  BUILD_ID:        $(cat .next/BUILD_ID)"
echo "  standalone:      - $(du -sh .next/standalone/ | cut -f1)"
echo ""
echo "测试生产服务器:"
echo "  cd .next/standalone && node server.js"
echo ""
