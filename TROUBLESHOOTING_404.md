# 404 错误诊断和修复指南

## 问题分析

部署后访问根路径显示 404，可能的原因：

1. **Standalone 路径问题** - Next.js standalone 模式生成的文件在完整项目路径下
2. **工作目录问题** - 服务器启动时的工作目录不正确
3. **静态文件路径问题** - `public/` 和 `.next/static/` 未正确复制
4. **环境变量问题** - `NEXTAUTH_URL` 配置错误

---

## 快速诊断

### 1. 检查服务器是否正常运行

```bash
# 检查进程
ps aux | grep node

# 检查端口
lsof -i :3000
# 或
netstat -tulpn | grep :3000
```

### 2. 检查服务器日志

```bash
# 如果使用 PM2
pm2 logs project-management-system

# 如果直接运行
# 查看控制台输出
```

### 3. 测试 API 端点

```bash
# 测试健康检查端点
curl http://localhost:3000/api/health

# 预期返回: {"status":"ok","timestamp":"..."}
```

---

## 解决方案

### 方案 1: 修复 standalone 部署路径（推荐）

standalone 模式生成的文件在完整项目路径下，需要调整启动方式：

#### 步骤 1: 创建正确的部署脚本

创建 `deploy.sh`:

```bash
#!/bin/bash

# 设置目标目录
DEPLOY_DIR="/opt/project-management-system"

# 清理并创建部署目录
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# 复制 standalone 包（注意路径）
cp -r .next/standalone/Desktop/AI/Test/project-management-system/* $DEPLOY_DIR/

# 复制 .next/static
mkdir -p $DEPLOY_DIR/.next
cp -r .next/static $DEPLOY_DIR/.next/

# 复制 public 目录（包含字体）
cp -r public $DEPLOY_DIR/

# 复制 Prisma 相关文件
cp -r prisma $DEPLOY_DIR/
cp -r node_modules/.prisma $DEPLOY_DIR/node_modules/

echo "部署完成！目标目录: $DEPLOY_DIR"
```

#### 步骤 2: 运行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

#### 步骤 3: 启动服务

```bash
cd /opt/project-management-system
NODE_ENV=production node server.js
```

---

### 方案 2: 禁用 standalone 模式（最简单）

如果不需要 standalone 模式的优化，可以禁用它：<tool_call>Read<arg_key>file_path</arg_key><arg_value>/Users/aaron.he/Desktop/AI/Test/project-management-system/next.config.ts