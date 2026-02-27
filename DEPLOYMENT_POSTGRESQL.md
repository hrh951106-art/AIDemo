# 生产环境部署指南 - PostgreSQL 版本

本文档介绍如何使用 PostgreSQL 数据库部署项目管理系统到生产环境。

---

## 📋 前置要求

- Docker 和 Docker Compose
- 域名（可选，用于 HTTPS）
- 服务器（推荐配置：2核4G以上）

---

## 🚀 快速部署

### 方式一：使用 Docker Compose（推荐）

**1. 准备配置文件**

```bash
# 编辑 .env.production 文件
nano .env.production
```

修改以下配置：
```env
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/project_management?schema=public"
NEXTAUTH_URL="http://your-domain.com"
NEXTAUTH_SECRET="your-random-secret-key-here"
```

**2. 运行部署脚本**

```bash
./deploy-docker.sh
```

脚本会自动：
- ✅ 检查 Docker 环境
- ✅ 配置环境变量
- ✅ 更新 Prisma schema
- ✅ 构建 Docker 镜像
- ✅ 启动 PostgreSQL 数据库
- ✅ 运行数据库迁移
- ✅ 启动应用

**3. 访问应用**

部署完成后，访问：`http://your-server-ip:3000`

---

### 方式二：手动部署

**1. 启动 PostgreSQL**

```bash
docker-compose -f docker-compose.prod.yml up -d postgres
```

**2. 等待数据库就绪**

```bash
# 检查数据库状态
docker exec project-management-postgres pg_isready -U postgres
```

**3. 运行迁移**

```bash
# 生成 Prisma Client
npx prisma generate

# 推送 schema 到数据库
npx prisma db push

# 或使用迁移
npx prisma migrate deploy
```

**4. 构建并启动应用**

```bash
# 构建镜像
docker-compose -f docker-compose.prod.yml build

# 启动应用
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔧 常用命令

### 查看服务状态

```bash
docker-compose -f docker-compose.prod.yml ps
```

### 查看日志

```bash
# 查看所有日志
docker-compose -f docker-compose.prod.yml logs -f

# 只查看应用日志
docker-compose -f docker-compose.prod.yml logs -f app

# 只查看数据库日志
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml restart

# 只重启应用
docker-compose -f docker-compose.prod.yml restart app
```

### 停止服务

```bash
# 停止所有服务
docker-compose -f docker-compose.prod.yml down

# 停止并删除数据卷（⚠️ 会删除数据库数据）
docker-compose -f docker-compose.prod.yml down -v
```

### 进入容器

```bash
# 进入应用容器
docker exec -it project-management-app sh

# 进入数据库容器
docker exec -it project-management-postgres psql -U postgres -d project_management
```

---

## 💾 数据库管理

### 备份数据库

```bash
./backup-production-db.sh
```

备份文件会保存在 `./backups/` 目录。

### 恢复数据库

```bash
./restore-production-db.sh ./backups/production_backup_20240227_120000.sql.gz
```

### 手动备份

```bash
# 备份
docker exec project-management-postgres pg_dump -U postgres project_management > backup.sql

# 恢复
docker exec -i project-management-postgres psql -U postgres -d project_management < backup.sql
```

---

## 🔐 安全配置

### 1. 生成安全的 NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### 2. 使用强密码

数据库密码至少 16 位，包含大小写字母、数字和特殊字符。

### 3. 配置防火墙

```bash
# 只允许本地访问数据库
# 修改 docker-compose.prod.yml，移除 postgres 的 ports 配置
```

### 4. 使用 HTTPS

推荐使用 Nginx 或 Caddy 作为反向代理：

**示例 Caddy 配置：**

```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

**示例 Nginx 配置：**

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

---

## 📊 监控

### 查看容器资源使用

```bash
docker stats
```

### 查看数据库连接

```bash
docker exec project-management-postgres psql -U postgres -d project_management -c "SELECT * FROM pg_stat_activity;"
```

---

## 🛠️ 故障排查

### 应用无法启动

1. 检查日志
```bash
docker-compose -f docker-compose.prod.yml logs app
```

2. 检查数据库连接
```bash
docker exec project-management-postgres pg_isready -U postgres
```

3. 检查环境变量
```bash
docker exec project-management-app env | grep DATABASE_URL
```

### 数据库迁移失败

1. 进入数据库容器
```bash
docker exec -it project-management-postgres psql -U postgres -d project_management
```

2. 手动运行迁移
```bash
docker-compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

### 端口被占用

修改 `docker-compose.prod.yml` 中的端口映射：

```yaml
ports:
  - "3001:3000"  # 使用 3001 端口
```

---

## 📦 生产环境检查清单

部署前检查：

- [ ] 已修改数据库密码
- [ ] 已设置 NEXTAUTH_SECRET
- [ ] 已配置正确的域名
- [ ] 已配置 HTTPS（推荐）
- [ ] 已设置数据库定期备份
- [ ] 已配置防火墙规则
- [ ] 已测试应用功能
- [ ] 已配置日志监控

---

## 🔄 更新应用

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker-compose -f docker-compose.prod.yml build

# 3. 重启服务
docker-compose -f docker-compose.prod.yml up -d

# 4. 运行迁移（如有）
docker-compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

---

## 📞 支持

如遇问题，请查看：
- 应用日志：`docker-compose -f docker-compose.prod.yml logs -f app`
- 数据库日志：`docker-compose -f docker-compose.prod.yml logs -f postgres`
- 故障排查：参考本文档"故障排查"章节
