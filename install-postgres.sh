#!/bin/bash

# PostgreSQL 安装和配置脚本（macOS）
# 此脚本提供两种安装方式：Postgres.app 或 Homebrew

set -e

echo "================================================"
echo "PostgreSQL 安装和配置脚本"
echo "================================================"
echo ""

# 检测是否已安装 PostgreSQL
if command -v psql &> /dev/null; then
    echo "✓ PostgreSQL 已安装: $(psql --version)"
    POSTGRES_INSTALLED=true
else
    echo "✗ PostgreSQL 未安装"
    POSTGRES_INSTALLED=false
fi

echo ""
echo "请选择安装方式："
echo "1) Postgres.app（推荐，最简单）"
echo "2) Homebrew（需要先修复 Homebrew）"
echo "3) 跳过安装，我已经安装了"
echo ""
read -p "请输入选项 [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "正在下载 Postgres.app..."
        echo "请访问以下链接下载："
        echo "https://postgresapp.com/downloads.html"
        echo ""
        echo "或者使用 curl 下载："
        echo "curl -L https://github.com/PostgresApp/PostgresApp/releases/download/v2.6.1/Postgres-2.6.1-15.dmg -o ~/Downloads/Postgres.dmg"
        echo ""
        echo "下载后："
        echo "1. 打开 DMG 文件"
        echo "2. 将 Postgres.app 拖到 Applications 文件夹"
        echo "3. 打开 Postgres.app"
        echo "4. 点击 'Initialize' 创建默认数据库"
        echo "5. 确保服务器显示为 'Running'"
        echo ""
        read -p "安装完成后按回车继续..."
        ;;
    2)
        echo ""
        echo "使用 Homebrew 安装 PostgreSQL..."
        if ! command -v brew &> /dev/null; then
            echo "错误: Homebrew 未安装"
            echo "请先安装 Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
        brew install postgresql@16
        brew services start postgresql@16
        echo "✓ PostgreSQL 已安装并启动"
        ;;
    3)
        echo "跳过安装步骤..."
        ;;
    *)
        echo "无效选项"
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "配置数据库"
echo "================================================"

# 等待 PostgreSQL 启动
echo "等待 PostgreSQL 启动..."
sleep 3

# 测试连接
if PGPASSWORD='' psql -h localhost -U $(whoami) -c 'SELECT 1' &> /dev/null; then
    echo "✓ 可以连接到 PostgreSQL"
    DB_USER=$(whoami)
else
    echo ""
    echo "无法连接到 PostgreSQL。"
    echo "请确保："
    echo "1. Postgres.app 正在运行"
    echo "2. 或者 PostgreSQL 服务已启动"
    echo ""
    read -p "按回车继续..." && exit 1
fi

# 创建数据库
echo ""
echo "创建数据库..."
PGPASSWORD='' psql -h localhost -U $DB_USER -c "DROP DATABASE IF EXISTS project_management;" 2>/dev/null || true
PGPASSWORD='' psql -h localhost -U $DB_USER -c "CREATE DATABASE project_management;"
echo "✓ 数据库 project_management 已创建"

# 设置数据库密码（可选）
echo ""
read -p "是否要为数据库用户设置密码？[y/N] " set_password
if [[ $set_password =~ ^[Yy]$ ]]; then
    read -sp "请输入密码: " db_password
    echo ""
    PGPASSWORD='' psql -h localhost -U $DB_USER -c "ALTER USER $DB_USER WITH PASSWORD '$db_password';"
    echo "✓ 密码已设置"
else
    db_password=""
fi

echo ""
echo "================================================"
echo "更新 .env 文件"
echo "================================================"

# 更新 .env 文件
if [ -f .env ]; then
    # 备份旧文件
    cp .env .env.backup

    if [ -n "$db_password" ]; then
        new_db_url="postgresql://$DB_USER:$db_password@localhost:5432/project_management"
    else
        new_db_url="postgresql://$DB_USER@localhost:5432/project_management"
    fi

    # 使用 sed 替换 DATABASE_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"$new_db_url\"|" .env
    else
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"$new_db_url\"|" .env
    fi

    echo "✓ .env 文件已更新"
    echo "  DATABASE_URL=$new_db_url"
else
    echo "✗ .env 文件不存在"
fi

echo ""
echo "================================================"
echo "完成！"
echo "================================================"
echo ""
echo "数据库连接信息："
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: project_management"
echo "  User: $DB_USER"
echo ""
echo "下一步："
echo "1. 运行: npx prisma migrate dev"
echo "2. 运行: npx prisma generate"
echo "3. 运行: npm run dev"
echo ""
