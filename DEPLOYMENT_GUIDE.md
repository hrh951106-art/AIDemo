# 🚀 项目管理系统 - 生产环境部署完整指南

> 本文档提供了完整的生产环境部署方案，包含两种部署方式：传统部署和 Docker 部署。

---

## 📋 目录

1. [部署前准备](#部署前准备)
2. [方式一：传统部署（推荐新手）](#方式一传统部署)
3. [方式二：Docker 部署（推荐专业）](#方式二docker-部署)
4. [SSL 证书配置](#ssl-证书配置)
5. [监控和维护](#监控和维护)
6. [备份和恢复](#备份和恢复)
7. [故障排查](#故障排查)

---

## 部署前准备

### 服务器要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|---------|---------|
| **操作系统** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **CPU** | 2 核 | 4 核 |
| **内存** | 2 GB | 4-8 GB |
| **存储** | 40 GB SSD | 80 GB SSD |
| **带宽** | 5 Mbps | 10 Mbps+ |

### 域名准备

1. 购买域名（如：example.com）
2. 配置 DNS A 记录指向服务器 IP：
   ```
   A     @        你的服务器IP
   A     www      你的服务器IP
   ```

### 安全准备

```bash
# 登录服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 创建非 root 用户（可选但推荐）
adduser username
usermod -aG sudo username

# 配置 SSH 密钥登录
ssh-copy-id username@your-server-ip
```

---

## 方式一：传统部署

### 1. 使用自动部署脚本 ⭐

```bash
# 1. 上传项目到服务器
git clone <your-repo-url> /tmp/project-management
cd /tmp/project-management

# 2. 给脚本执行权限
chmod +x deployment/scripts/deploy.sh

# 3. 执行部署脚本
sudo ./deployment/scripts/deploy.sh
```

**脚本会自动完成：**
- ✅ 安装 Node.js 20.x
- ✅ 安装 PostgreSQL 16
- ✅ 创建数据库和用户
- ✅ 配置环境变量
- ✅ 安装依赖并构建
- ✅ 配置 PM2 进程管理
- ✅ 配置 Nginx 反向代理
- ✅ 配置防火墙

### 2. 手动部署步骤

如果不使用自动脚本，请按以下步骤操作：

#### 2.1 安装 Node.js

```bash
# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v  # 应显示 v20.x.x
npm -v   # 应显示 10.x.x
```

#### 2.2 安装 PostgreSQL

```bash
# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2.3 创建数据库

```bash
# 进入 PostgreSQL
sudo -u postgres psql

# 执行以下 SQL 命令
CREATE DATABASE project_management_prod;
CREATE USER project_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE project_management_prod TO project_user;
ALTER DATABASE project_management_prod OWNER TO project_user;
\c project_management_prod
GRANT ALL ON SCHEMA public TO project_user;
\q

# 保存密码
echo "DB_PASSWORD=your_secure_password" > /var/www/.db_password
```

#### 2.4 部署应用代码

```bash
# 创建应用目录
sudo mkdir -p /var/www/project-management-system
cd /var/www/project-management-system

# 克隆代码（或上传文件）
sudo git clone <your-repo-url> .
# 或使用 scp 上传

# 复制环境变量模板
sudo cp deployment/.env.production.example.env.production
sudo nano.env.production
```

**编辑 `.env.production`：**

```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 编辑配置文件
NODE_ENV="production"
PORT=3000

# 数据库
DATABASE_URL="postgresql://project_user:your_secure_password@localhost:5432/project_management_prod?connection_limit=10"
DIRECT_URL="postgresql://project_user:your_secure_password@localhost:5432/project_management_prod?connection_limit=10"

# NextAuth（必须修改）
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="生成的随机密钥"
```

#### 2.5 修改 Prisma 配置

```bash
# 修改数据库类型为 PostgreSQL
sudo nano prisma/schema.prisma

# 找到这一行并修改：
datasource db {
  provider = "postgresql"  # 从 sqlite 改为 postgresql
  url      = env("DATABASE_URL")
}
```

#### 2.6 安装依赖和构建

```bash
# 安装依赖
sudo npm ci --only=production

# 设置环境变量
export DATABASE_URL="postgresql://project_user:your_secure_password@localhost:5432/project_management_prod"
export DIRECT_URL="postgresql://project_user:your_secure_password@localhost:5432/project_management_prod"
export NODE_ENV=production
export NEXTAUTH_URL="http://47.100.177.171:3000"
export NEXTAUTH_SECRET="ZVoMdtqG6C6Blm4zriyuKhFtQVf52TMNenQrgfpe/tw="




NODE_ENV="production"
PORT=3000
NEXTAUTH_SECRET="ZVoMdtqG6C6Blm4zriyuKhFtQVf52TMNenQrgfpe/tw="
NEXTAUTH_URL="http://47.100.177.171:3000"
DATABASE_URL="postgresql://project_user:your_secure_password@localhost:5432/project_management_prod?connection_limit=10"
DIRECT_URL="postgresql://project_user:your_secure_password@localhost:5432/project_management_prod?connection_limit=10"




# 生成 Prisma Client
sudo npx prisma generate

# 运行数据库迁移
sudo npx prisma migrate deploy

# 构建应用
sudo npm run build
```

#### 2.7 安装和配置 PM2

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 复制 PM2 配置
sudo cp deployment/ecosystem.config.cjs ecosystem.config.cjs

# 修改 ecosystem.config.cjs 中的路径
# cwd: '/var/www/project-management-system'

# 启动应用
sudo pm2 start ecosystem.config.cjs

# 保存 PM2 配置
sudo pm2 save

# 设置开机自启
sudo pm2 startup systemd -u root --hp /root
```

#### 2.8 配置 Nginx

```bash
# 安装 Nginx
sudo apt install -y nginx

# 复制配置文件
sudo cp deployment/nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp deployment/nginx/project-management.conf /etc/nginx/sites-available/project-management

# 替换域名
sudo sed -i 's/your-domain.com/your-actual-domain.com/g' /etc/nginx/sites-available/project-management

# 创建符号链接
sudo ln -s /etc/nginx/sites-available/project-management /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 2.9 配置防火墙

```bash
# 启用 UFW
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 查看状态
sudo ufw status
```

---

## 方式二：Docker 部署

### 1. 安装 Docker 和 Docker Compose

```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt install -y docker-compose-plugin

# 验证安装
docker --version
docker compose version

# 添加用户到 docker 组（可选）
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 配置环境变量

```bash
# 克隆代码
git clone <your-repo-url> /opt/project-management
cd /opt/project-management

# 复制环境变量模板
cp deployment/.env.production.example .env

# 编辑环境变量
nano .env
```

**`.env` 文件内容：**

```bash
# 生成密码和密钥
DB_PASSWORD=$(openssl rand -base64 24)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# 数据库
DB_PASSWORD=your_generated_password

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_generated_secret
```

### 3. 启动 Docker Compose

```bash
# 启动所有服务
docker compose -f deployment/docker-compose.yml up -d

# 查看日志
docker compose -f deployment/docker-compose.yml logs -f

# 查看状态
docker compose -f deployment/docker-compose.yml ps
```

### 4. 初始化数据库

```bash
# 等待 PostgreSQL 启动完成（约 30 秒）

# 进入应用容器
docker compose -f deployment/docker-compose.yml exec app bash

# 运行数据库迁移
npx prisma migrate deploy

# 退出容器
exit
```

---

## SSL 证书配置

### 使用 Let's Encrypt 免费 SSL 证书

#### 传统部署方式

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run

# 查看证书
sudo certbot certificates
```

**Certbot 会自动：**
- 修改 Nginx 配置启用 HTTPS
- 设置自动证书续期（cron 任务）
- 配置 HTTP 到 HTTPS 重定向

#### Docker 部署方式

```bash
# 获取证书
sudo docker compose -f deployment/docker-compose.yml run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d your-domain.com \
  -d www.your-domain.com

# 重启 Nginx
sudo docker compose -f deployment/docker-compose.yml restart nginx
```

---

## 监控和维护

### 1. 查看应用状态

#### 传统部署

```bash
# PM2 状态
pm2 status

# 查看日志
pm2 logs project-management

# 实时监控
pm2 monit
```

#### Docker 部署

```bash
# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f app

# 查看资源使用
docker stats
```

### 2. 系统资源监控

```bash
# CPU 和内存使用
htop

# 磁盘使用
df -h

# 查看特定进程
ps aux | grep node

# 网络连接
netstat -tulpn
```

### 3. 日志管理

```bash
# Nginx 访问日志
sudo tail -f /var/log/nginx/project-management-access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/project-management-error.log

# PM2 日志
pm2 logs project-management --lines 100
```

---

## 备份和恢复

### 1. 自动备份

#### 设置定时任务

```bash
# 给脚本执行权限
sudo chmod +x deployment/scripts/backup.sh

# 测试备份
sudo ./deployment/scripts/backup.sh

# 添加到 crontab（每天凌晨 2 点备份）
sudo crontab -e

# 添加以下行：
0 2 * * * /var/www/project-management-system/deployment/scripts/backup.sh
```

#### 手动备份

```bash
# PostgreSQL 备份
sudo -u postgres pg_dump project_management_prod | gzip > backup_$(date +%Y%m%d).sql.gz

# SQLite 备份（如果使用）
cp prisma/prod.db prisma/prod.db.backup.$(date +%Y%m%d)
```

### 2. 恢复数据

```bash
# 使用恢复脚本
sudo chmod +x deployment/scripts/restore.sh
sudo ./deployment/scripts/restore.sh /path/to/backup/file.sql.gz
```

---

## 故障排查

### 1. 应用无法启动

```bash
# 检查 PM2 状态
pm2 status
pm2 logs project-management --err

# 重启应用
pm2 restart project-management

# 完全重建
pm2 delete project-management
pm2 start ecosystem.config.cjs
```

### 2. 数据库连接失败

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接
sudo -u postgres psql -c "SELECT version();"

# 检查环境变量
cat /var/www/project-management-system/.env.production

# 测试连接
psql -h localhost -U project_user -d project_management_prod
```

### 3. Nginx 502 错误

```bash
# 检查应用是否运行
pm2 status

# 检查端口占用
sudo lsof -i :3000

# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 4. 构建失败

```bash
# 清理缓存
rm -rf .next node_modules
npm ci
npm run build

# 检查内存
free -h

# 如果内存不足，创建 swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 5. SSL 证书问题

```bash
# 检查证书有效期
sudo certbot certificates

# 手动续期
sudo certbot renew

# 强制续期
sudo certbot renew --force-renewal

# 重新获取证书
sudo certbot --nginx -d your-domain.com --force-renewal
```

---

## 性能优化

### 1. PostgreSQL 优化

```bash
# 编辑配置
sudo nano /etc/postgresql/16/main/postgresql.conf

# 添加/修改以下配置
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 2. Nginx 优化

已在 `deployment/nginx/nginx.conf` 中配置：
- Gzip 压缩
- 静态资源缓存
- 连接保持
- 缓冲区优化

### 3. Node.js 优化

```bash
# 增加内存限制
node --max-old-space-size=4096

# PM2 集群模式（已在 ecosystem.config.cjs 中配置）
instances: 'max'
exec_mode: 'cluster'
```

---

## 安全加固

### 1. SSH 安全

```bash
# 禁用密码登录
sudo nano /etc/ssh/sshd_config

# 修改以下配置
PasswordAuthentication no
PermitRootLogin no
Port 2222  # 修改默认端口

# 重启 SSH
sudo systemctl restart sshd
```

### 2. 防火墙配置

```bash
# 配置 UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp  # 自定义 SSH 端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 3. Fail2Ban 防暴力破解

```bash
# 安装
sudo apt install -y fail2ban

# 配置
sudo nano /etc/fail2ban/jail.local

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

# 启动
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 更新部署

### 传统部署

```bash
cd /var/www/project-management-system

# 1. 备份数据库
sudo ./deployment/scripts/backup.sh

# 2. 拉取最新代码
sudo git pull origin main

# 3. 安装新依赖
sudo npm ci

# 4. 运行数据库迁移
sudo npx prisma migrate deploy

# 5. 重新构建
sudo npm run build

# 6. 重启应用
sudo pm2 restart project-management
```

### Docker 部署

```bash
cd /opt/project-management

# 1. 备份数据库
docker compose exec postgres pg_dump -U project_user project_management_prod > backup.sql

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建镜像
docker compose -f deployment/docker-compose.yml build --no-cache

# 4. 重启服务
docker compose -f deployment/docker-compose.yml up -d

# 5. 运行数据库迁移
docker compose -f deployment/docker-compose.yml exec app npx prisma migrate deploy
```

---

## 部署检查清单

- [ ] 服务器系统已更新
- [ ] Node.js 20.x 已安装
- [ ] PostgreSQL 已安装并配置
- [ ] 数据库和用户已创建
- [ ] 环境变量已配置（`.env.production`）
- [ ] `NEXTAUTH_SECRET` 已生成
- [ ] `NEXTAUTH_URL` 已配置正确域名
- [ ] Prisma schema 已改为 PostgreSQL
- [ ] 数据库迁移已运行
- [ ] 应用已构建（`npm run build`）
- [ ] PM2 已安装并配置
- [ ] 应用已启动（`pm2 status`）
- [ ] Nginx 已安装并配置
- [ ] 防火墙已配置
- [ ] SSL 证书已安装
- [ ] HTTPS 访问正常
- [ ] 备份脚本已配置
- [ ] 定时任务已设置
- [ ] 监控已配置

---

## 快速命令参考

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs project-management

# 重启应用
pm2 restart project-management

# 查看数据库
sudo -u postgres psql -d project_management_prod

# 备份数据库
sudo /var/www/project-management-system/deployment/scripts/backup.sh

# 查看 Nginx 状态
sudo systemctl status nginx

# 测试 Nginx 配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx

# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看 Docker 日志
docker compose logs -f
```

---

## 支持和帮助

如遇到问题：

1. 查看日志文件
2. 使用上述故障排查指南
3. 检查配置文件是否正确
4. 确保所有环境变量已设置
5. 验证数据库连接

**部署成功后，请记得：**
- 定期备份数据
- 监控系统资源
- 定期更新依赖包
- 关注安全公告

---

**部署完成后访问：** `https://your-domain.com` 🎉
