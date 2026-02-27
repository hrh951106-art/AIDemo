# 📦 部署配置文件说明

本目录包含项目管理系统生产环境部署所需的所有配置文件和脚本。

---

## 📁 目录结构

```
deployment/
├── .env.production.example      # 生产环境变量模板
├── Dockerfile                    # Docker 镜像构建文件
├── docker-compose.yml            # Docker Compose 编排配置
├── ecosystem.config.cjs          # PM2 进程管理配置
├── nginx/
│   ├── nginx.conf               # Nginx 主配置
│   └── project-management.conf  # 站点配置
├── scripts/
│   ├── deploy.sh                # 自动部署脚本
│   ├── backup.sh                # 数据库备份脚本
│   ├── restore.sh               # 数据库恢复脚本
│   └── init-db.sql              # PostgreSQL 初始化脚本
└── ssl/                         # SSL 证书目录（自动生成）
```

---

## 🚀 快速开始

### 方式一：自动部署脚本

```bash
# 给脚本执行权限
chmod +x deployment/scripts/deploy.sh

# 运行自动部署
sudo ./deployment/scripts/deploy.sh
```

**自动完成：**
- ✅ 系统更新
- ✅ 安装 Node.js 20.x
- ✅ 安装 PostgreSQL 16
- ✅ 创建数据库和用户
- ✅ 配置环境变量
- ✅ 安装依赖并构建
- ✅ 配置 PM2
- ✅ 配置 Nginx
- ✅ 配置防火墙

### 方式二：Docker 部署

```bash
# 1. 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin

# 2. 配置环境变量
cp deployment/.env.production.example .env
nano .env  # 编辑配置

# 3. 启动服务
docker compose -f deployment/docker-compose.yml up -d

# 4. 获取 SSL 证书
docker compose -f deployment/docker-compose.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d your-domain.com
```

---

## 📝 配置文件说明

### `.env.production.example`

生产环境变量模板，包含：
- 数据库连接字符串
- NextAuth 配置
- 应用配置

**使用方法：**
```bash
cp deployment/.env.production.example .env.production
nano .env.production  # 修改配置
```

**必须修改的配置：**
- `DATABASE_URL` - 数据库连接字符串
- `NEXTAUTH_URL` - 应用域名
- `NEXTAUTH_SECRET` - 认证密钥（使用 `openssl rand -base64 32` 生成）

### `ecosystem.config.cjs`

PM2 进程管理配置文件。

**关键配置：**
- `cwd`: 应用目录（需修改为实际路径）
- `instances`: 进程实例数（`'max'` = CPU 核心数）
- `max_memory_restart`: 内存限制

**使用方法：**
```bash
cp deployment/ecosystem.config.cjs ecosystem.config.cjs
nano ecosystem.config.cjs  # 修改路径
pm2 start ecosystem.config.cjs
```

### `nginx/project-management.conf`

Nginx 反向代理配置。

**包含配置：**
- HTTP → HTTPS 重定向
- SSL/TLS 配置
- 安全响应头
- Gzip 压缩
- 静态资源缓存
- WebSocket 支持

**使用方法：**
```bash
# 替换域名
sed -i 's/your-domain.com/your-actual-domain.com/g' deployment/nginx/project-management.conf

# 复制到 Nginx 目录
cp deployment/nginx/project-management.conf /etc/nginx/sites-available/project-management
ln -s /etc/nginx/sites-available/project-management /etc/nginx/sites-enabled/

# 测试并重载
nginx -t
systemctl reload nginx
```

### `docker-compose.yml`

Docker Compose 编排文件。

**包含服务：**
- PostgreSQL 16 数据库
- Next.js 应用
- Nginx 反向代理
- Certbot SSL 证书自动续期

**使用方法：**
```bash
# 配置环境变量
cp deployment/.env.production.example .env

# 启动所有服务
docker compose -f deployment/docker-compose.yml up -d

# 查看状态
docker compose -f deployment/docker-compose.yml ps

# 查看日志
docker compose -f deployment/docker-compose.yml logs -f
```

---

## 🛠️ 脚本说明

### `deploy.sh` - 自动部署脚本

**功能：**
- 一键自动化部署
- 生成安全密码和密钥
- 配置所有必要服务

**使用方法：**
```bash
chmod +x deployment/scripts/deploy.sh
sudo ./deployment/scripts/deploy.sh
```

**执行时间：** 约 10-15 分钟

### `backup.sh` - 数据库备份脚本

**功能：**
- 备份 PostgreSQL 数据库
- 备份环境变量文件
- 备份上传文件
- 自动清理过期备份（默认 30 天）

**使用方法：**
```bash
# 手动备份
sudo ./deployment/scripts/backup.sh

# 添加到定时任务（每天凌晨 2 点）
crontab -e
# 添加：0 2 * * * /path/to/deployment/scripts/backup.sh
```

**备份位置：** `/var/backups/project-management/`

### `restore.sh` - 数据库恢复脚本

**功能：**
- 从备份恢复数据库
- 恢复前自动备份当前数据
- 运行必要的数据库迁移

**使用方法：**
```bash
# 从备份文件恢复
sudo ./deployment/scripts/restore.sh /path/to/backup/db_20240101.sql.gz
```

---

## 🔐 安全建议

1. **永远不要**将 `.env.production` 提交到 Git
2. **必须修改**所有默认密码和密钥
3. **定期备份**数据库和配置文件
4. **使用 HTTPS** 配置有效的 SSL 证书
5. **配置防火墙** 只开放必要端口
6. **定期更新** 系统和依赖包

---

## 📊 监控和维护

### 查看应用状态

```bash
# PM2 状态
pm2 status

# Docker 状态
docker compose ps

# 系统资源
htop
```

### 查看日志

```bash
# PM2 日志
pm2 logs project-management

# Docker 日志
docker compose logs -f app

# Nginx 日志
tail -f /var/log/nginx/project-management-access.log
tail -f /var/log/nginx/project-management-error.log
```

### 数据库管理

```bash
# 连接数据库
psql -h localhost -U project_user -d project_management_prod

# 备份数据库
pg_dump -U project_user project_management_prod | gzip > backup.sql.gz

# 恢复数据库
gunzip -c backup.sql.gz | psql -U project_user project_management_prod
```

---

## 🔄 更新部署

### 传统部署

```bash
cd /var/www/project-management-system

# 1. 备份
./deployment/scripts/backup.sh

# 2. 更新代码
git pull

# 3. 安装依赖
npm ci

# 4. 运行迁移
npx prisma migrate deploy

# 5. 重新构建
npm run build

# 6. 重启
pm2 restart project-management
```

### Docker 部署

```bash
# 1. 备份
docker compose exec postgres pg_dump -U project_user project_management_prod > backup.sql

# 2. 更新代码
git pull

# 3. 重新构建
docker compose -f deployment/docker-compose.yml build --no-cache

# 4. 重启服务
docker compose -f deployment/docker-compose.yml up -d

# 5. 运行迁移
docker compose exec app npx prisma migrate deploy
```

---

## ❓ 常见问题

### Q: 如何生成 NEXTAUTH_SECRET？

```bash
openssl rand -base64 32
```

### Q: 如何生成数据库密码？

```bash
openssl rand -base64 24
```

### Q: 应用无法启动？

```bash
# 检查日志
pm2 logs project-management --err

# 检查环境变量
cat .env.production

# 检查数据库连接
psql -h localhost -U project_user -d project_management_prod
```

### Q: Nginx 502 错误？

```bash
# 检查应用是否运行
pm2 status

# 检查端口
lsof -i :3000

# 重启应用
pm2 restart project-management
```

---

## 📖 完整文档

详细部署指南请参考：[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)

---

## 🆘 获取帮助

如遇到问题：

1. 查看日志文件
2. 使用故障排查指南
3. 检查配置文件
4. 验证环境变量

**部署完成后访问：** `https://your-domain.com` 🎉
