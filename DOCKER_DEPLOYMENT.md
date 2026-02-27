# 生产环境部署指南 (Docker + PostgreSQL)

## 📋 前置要求

- Docker 和 Docker Compose
- 服务器（推荐 2核4G以上）
- 域名（可选）

---

## 🚀 快速部署

### 方法一：使用自动化脚本（推荐）

```bash
# 1. 配置环境变量
cat > .env << EOF
POSTGRES_PASSWORD=your-strong-password
NEXTAUTH_URL=http://your-domain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
EOF

# 2. 构建并启动
./build-docker.sh
docker compose -f docker-compose.prod.yml up -d

# 3. 运行数据库迁移
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

### 方法二：手动部署

```bash
# 1. 更新 Prisma schema 为 PostgreSQL
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# 2. 创建环境变量文件
cp .env.example.production .env
# 编辑 .env 文件，填入实际值

# 3. 构建镜像
docker compose -f docker-compose.prod.yml build

# 4. 启动服务
docker compose -f docker-compose.prod.yml up -d

# 5. 运行迁移
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

---

## 🔧 环境变量说明

在 `.env` 文件中配置以下变量：

```bash
# PostgreSQL 数据库密码
POSTGRES_PASSWORD=your-strong-password-here

# NextAuth 配置
NEXTAUTH_URL=http://your-domain.com  # 生产环境域名
NEXTAUTH_SECRET=your-random-secret   # 运行: openssl rand -base64 32
```

---

## 📊 验证部署

### 检查服务状态

```bash
# 查看容器状态
docker compose -f docker-compose.prod.yml ps

# 预期输出：
# project-management-postgres   running
# project-management-app        running
```

### 检查日志

```bash
# 查看所有日志
docker compose -f docker-compose.prod.yml logs -f

# 只查看应用日志
docker compose -f docker-compose.prod.yml logs -f app

# 只查看数据库日志
docker compose -f docker-compose.prod.yml logs -f postgres
```

### 测试连接

```bash
# 测试应用
curl http://localhost:3000/api/health

# 预期输出：
# {"status":"ok","timestamp":"...","database":"connected"}
```

---

## 🗄️ 数据库管理

### 运行迁移

```bash
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

### 备份数据库

```bash
mkdir -p backups
docker exec project-management-postgres pg_dump -U postgres project_management > backups/backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
docker exec -i project-management-postgres psql -U postgres -d project_management < backups/backup_20240227.sql
```

### 访问数据库

```bash
docker exec -it project-management-postgres psql -U postgres -d project_management
```

---

## 🔄 更新应用

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker compose -f docker-compose.prod.yml build

# 3. 重启服务
docker compose -f docker-compose.prod.yml up -d

# 4. 运行迁移（如有）
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

---

## 🛠️ 故障排查

### 应用无法启动

1. **检查构建日志**
```bash
docker compose -f docker-compose.prod.yml logs app
```

2. **检查环境变量**
```bash
docker compose -f docker-compose.prod.yml exec app env | grep -E "DATABASE_URL|NEXTAUTH"
```

3. **重新构建**
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### 数据库连接失败

1. **检查数据库状态**
```bash
docker exec project-management-postgres pg_isready -U postgres
```

2. **查看数据库日志**
```bash
docker compose -f docker-compose.prod.yml logs postgres
```

3. **手动测试连接**
```bash
docker compose -f docker-compose.prod.yml exec app npx prisma db push
```

### TypeScript 构建错误

如果遇到 TypeScript 编译错误：

1. **确认本地构建成功**
```bash
npm run build
```

2. **清理 Docker 缓存**
```bash
docker compose -f docker-compose.prod.yml down
docker system prune -a
docker compose -f docker-compose.prod.yml build --no-cache
```

3. **检查 Prisma schema**
```bash
# 确保 provider 是 postgresql
cat prisma/schema.prisma | grep provider
```

---

## 🔐 安全建议

### 1. 生成安全的密钥

```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 生成数据库密码
openssl rand -base64 24
```

### 2. 使用强密码

数据库密码至少 16 位，包含大小写字母、数字和特殊字符。

### 3. 配置 HTTPS

使用 Caddy 或 Nginx 作为反向代理：

**Caddyfile:**
```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

**Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. 限制数据库访问

修改 `docker-compose.prod.yml`，移除 postgres 的端口映射：
```yaml
# 注释掉或删除这部分
# ports:
#   - "5432:5432"
```

---

## 📦 资源限制

如果需要限制资源使用，在 `docker-compose.prod.yml` 中添加：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 🔄 切换回本地开发

部署完成后，如需继续本地开发：

```bash
# 恢复 SQLite 配置
cp prisma/schema.prisma.local-backup prisma/schema.prisma

# 重新生成 Prisma Client
npx prisma generate

# 启动开发服务器
npm run dev
```

---

## 📞 支持

如遇问题：
1. 查看本文档的"故障排查"章节
2. 检查应用和数据库日志
3. 查看 Prisma 文档: https://www.prisma.io/docs
