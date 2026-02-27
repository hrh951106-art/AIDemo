# 生产环境 TypeScript 构建错误排查指南

## 🔍 问题诊断

生产环境 Docker 构建失败，提示 "Running TypeScript... Failed to compile"

---

## ✅ 解决方案

### 方案一：已修复（推荐）

我们已更新以下文件来解决这个问题：

1. **Dockerfile** - 在构建阶段设置正确的环境变量
2. **docker-compose.prod.yml** - 使用环境变量替代硬编码值
3. **build-docker.sh** - 自动化构建脚本

### 方案二：手动修复步骤

如果仍然遇到问题，请按以下步骤操作：

#### 步骤 1: 确保 Prisma Schema 正确

```bash
# 检查当前 provider
cat prisma/schema.prisma | grep "provider ="

# 如果是 sqlite，需要改为 postgresql（仅用于生产构建）
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# 验证更改
cat prisma/schema.prisma | grep "provider ="
# 应该显示: provider = "postgresql"
```

#### 步骤 2: 创建环境变量文件

```bash
# 创建生产环境变量
cat > .env << 'EOF'
POSTGRES_PASSWORD=your-strong-password-here
NEXTAUTH_URL=http://your-domain.com
NEXTAUTH_SECRET=your-random-secret-key
EOF

# 编辑并填入实际值
nano .env
```

#### 步骤 3: 清理并重新构建

```bash
# 停止并删除旧容器
docker compose -f docker-compose.prod.yml down

# 清理构建缓存
docker system prune -af

# 重新构建（无缓存）
docker compose -f docker-compose.prod.yml build --no-cache
```

#### 步骤 4: 验证构建

```bash
# 检查镜像是否创建成功
docker images | grep project-management

# 如果看到镜像列表，说明构建成功
```

---

## 🐛 常见错误及解决方案

### 错误 1: Type error: params is Promise

**症状：**
```
Type error: Type '{ params: Promise<{ id: string; }>; }' is not assignable to type '{ params: { id: string; }; }'
```

**原因：** Next.js 16 要求 params 是 Promise 类型

**解决方案：** 已修复所有路由文件。如果仍有问题，运行：
```bash
grep -r "params.*{.*id.*string.*}" src/app/api --include="*.ts"
```
确保所有文件使用 `Promise<{ id: string }>` 而不是 `{ id: string }`

### 错误 2: mode insensitive not supported

**症状：**
```
Object literal may only specify known properties, and 'mode' does not exist in type
```

**原因：** SQLite 不支持 `mode: 'insensitive'`

**解决方案：** 已修复 `src/app/api/users/route.ts`，移除了该选项

### 错误 3: Prisma Client generation failed

**症状：**
```
Error: P3005
The database schema for `postgresql` is not empty at the root location
```

**解决方案：**
```bash
# 在容器中运行
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

### 错误 4: Build fails in Docker but works locally

**可能原因：**
1. Docker 镜像中的 Node.js 版本不同
2. Docker 构建环境缺少环境变量
3. Docker 缓存问题

**解决方案：**
```bash
# 1. 检查 Dockerfile 中的 Node 版本
# 当前使用: node:20-alpine

# 2. 确保环境变量设置正确
# Dockerfile 应该包含:
# ENV NODE_ENV=production
# ENV NEXT_TELEMETRY_DISABLED=1

# 3. 清理缓存并重新构建
docker compose -f docker-compose.prod.yml build --no-cache
```

---

## 🔧 完整修复流程

如果上述方案都无效，请按以下流程操作：

### 1. 备份并更新 Schema

```bash
# 备份本地开发配置
cp prisma/schema.prisma prisma/schema.prisma.dev
cp .env .env.dev

# 更新为生产配置
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
```

### 2. 本地测试构建

```bash
# 使用生产配置本地测试
NODE_ENV=production npm run build

# 如果成功，说明代码没问题
# 如果失败，查看具体错误信息
```

### 3. 清理 Docker 环境

```bash
# 完全清理
docker compose -f docker-compose.prod.yml down -v
docker system prune -af

# 删除旧镜像
docker rmi $(docker images | grep project-management | awk '{print $3}')
```

### 4. 重新构建

```bash
# 使用自动化脚本
./build-docker.sh

# 或手动构建
docker compose -f docker-compose.prod.yml build
```

### 5. 启动服务

```bash
# 启动数据库
docker compose -f docker-compose.prod.yml up -d postgres

# 等待数据库就绪
sleep 10

# 运行迁移
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# 启动应用
docker compose -f docker-compose.prod.yml up -d app
```

### 6. 验证部署

```bash
# 检查容器状态
docker compose -f docker-compose.prod.yml ps

# 测试 API
curl http://localhost:3000/api/health

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

---

## 🔄 部署后恢复本地开发

部署完成后，恢复本地开发环境：

```bash
# 恢复 SQLite 配置
cp prisma/schema.prisma.dev prisma/schema.prisma

# 恢复开发环境变量
cp .env.dev .env

# 重新生成 Prisma Client
npx prisma generate

# 启动开发服务器
npm run dev
```

---

## 📋 检查清单

部署前检查：

- [ ] Prisma schema provider 设置为 `postgresql`
- [ ] `.env` 文件已创建并配置
- [ ] 数据库密码已设置（至少 16 位）
- [ ] NEXTAUTH_SECRET 已生成
- [ ] NEXTAUTH_URL 设置为实际域名
- [ ] 本地构建测试通过 (`npm run build`)
- [ ] Docker 镜像构建成功

---

## 💡 预防措施

为避免将来出现问题：

1. **分离配置文件**
   - `.env` - 本地开发（SQLite）
   - `.env.production` - 生产环境（PostgreSQL）
   - `prisma/schema.prisma.dev` - 开发配置
   - `prisma/schema.prisma.prod` - 生产配置

2. **使用构建脚本**
   - 使用 `build-docker.sh` 自动化部署流程
   - 脚本会自动处理配置切换

3. **版本控制**
   - 将 `.env.example` 提交到 Git
   - 不要提交实际的 `.env` 文件
   - 添加到 `.gitignore`

4. **测试部署**
   - 在生产环境部署前先在测试环境验证
   - 使用相同的 Docker 镜像测试

---

## 📞 仍需帮助？

如果按照上述步骤仍然无法解决问题：

1. **收集错误信息**
```bash
# 保存完整构建日志
docker compose -f docker-compose.prod.yml build > build.log 2>&1

# 保存容器日志
docker compose -f docker-compose.prod.yml logs > logs.txt
```

2. **检查系统状态**
```bash
# Docker 版本
docker --version
docker compose version

# 系统资源
docker system df

# 磁盘空间
df -h
```

3. **查看详细文档**
   - Docker 部署: `DOCKER_DEPLOYMENT.md`
   - 数据库配置: `README_DATABASE.md`
   - 生产部署: `DEPLOYMENT_POSTGRESQL.md`
