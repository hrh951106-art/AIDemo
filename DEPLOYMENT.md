# 生产环境部署指南 - Alibaba Cloud Linux 3

## 系统要求

- **操作系统**: Alibaba Cloud Linux 3.2104 LTS 64位
- **Node.js**: >= 18.17.0
- **npm**: >= 9.0.0
- **数据库**: SQLite (已包含) 或 PostgreSQL

---

## 1. 服务器准备

### 1.1 安装Node.js

```bash
# 安装Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v
npm -v
```

### 1.2 安装PM2 (进程管理器)

```bash
sudo npm install -g pm2
```

### 1.3 安装Git (如果需要从Git拉取代码)

```bash
sudo yum install -y git
```

---

## 2. 项目部署

### 2.1 上传项目文件

```bash
# 方式1: 使用Git克隆
git clone <your-repository-url>
cd project-management-system

# 方式2: 使用SCP上传
# 在本地执行:
scp -r ./project-management-system root@your-server-ip:/root/

# 方式3: 使用SFTP工具上传
```

### 2.2 安装依赖

```bash
cd /root/project-management-system
npm install
```

### 2.3 配置环境变量

创建生产环境配置文件:

```bash
cp .env.example .env.production
vi .env.production
```

配置内容:

```env
# 数据库 (生产环境建议使用PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/project_management"

# 或继续使用SQLite
# DATABASE_URL="file:./prod.db"

# NextAuth配置 (重要！必须修改)
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="请生成一个随机字符串-至少32个字符"

# 应用环境
NODE_ENV="production"
```

**生成NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

### 2.4 数据库迁移

```bash
# 生成Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate deploy
```

### 2.5 构建项目

```bash
npm run build
```

---

## 3. 启动应用

### 3.1 使用PM2启动 (推荐)

```bash
# 启动应用
pm2 start npm --name "project-management" -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs project-management

# 查看状态
pm2 status
```

### 3.2 或直接启动

```bash
npm run start
```

---

## 4. Nginx反向代理配置

### 4.1 安装Nginx

```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4.2 配置Nginx

创建配置文件:

```bash
sudo vi /etc/nginx/conf.d/project-management.conf
```

配置内容:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 可选: 配置SSL证书
    # listen 443 ssl http2;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

重启Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## 5. 防火墙配置

```bash
# 开放HTTP和HTTPS端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 6. 常见问题排查

### 6.1 构建失败

```bash
# 清理缓存重新构建
rm -rf .next node_modules
npm install
npm run build
```

### 6.2 Prisma相关错误

```bash
# 重新生成Prisma Client
npx prisma generate

# 检查数据库连接
echo $DATABASE_URL

# 重置数据库 (慎用！会删除所有数据)
npx prisma migrate reset
```

### 6.3 查看应用日志

```bash
# PM2日志
pm2 logs project-management

# 实时监控
pm2 monit
```

### 6.4 端口被占用

```bash
# 查看3000端口占用
sudo lsof -i :3000

# 杀死进程
sudo kill -9 <PID>
```

---

## 7. 更新部署

```bash
# 1. 备份数据库
cp prisma/prod.db prisma/prod.db.backup.$(date +%Y%m%d)

# 2. 拉取最新代码
git pull

# 3. 安装新依赖
npm install

# 4. 运行数据库迁移
npx prisma migrate deploy

# 5. 重新构建
npm run build

# 6. 重启应用
pm2 restart project-management
```

---

## 8. 性能优化建议

### 8.1 使用PostgreSQL代替SQLite

生产环境强烈建议使用PostgreSQL:

```bash
# 安装PostgreSQL
sudo yum install -y postgresql postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE project_management;
CREATE USER project_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE project_management TO project_user;
\q
```

### 8.2 配置交换文件

```bash
# 检查当前swap
free -h

# 创建2GB交换文件
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 9. 监控和维护

### 9.1 系统资源监控

```bash
# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看CPU使用
top
```

### 9.2 自动备份脚本

创建备份脚本 `/root/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
cp prisma/prod.db $BACKUP_DIR/prod_$DATE.db

# 保留最近7天的备份
find $BACKUP_DIR -name "prod_*.db" -mtime +7 -delete

echo "备份完成: $DATE"
```

设置定时任务:

```bash
# 添加每天凌晨2点自动备份
crontab -e
# 添加: 0 2 * * * /root/backup.sh
```

---

## 10. 安全建议

1. **修改默认端口** - 不要使用3000端口暴露到公网
2. **配置防火墙** - 只开放必要的端口
3. **使用HTTPS** - 申请SSL证书启用HTTPS
4. **定期更新** - 定期更新系统和依赖包
5. **强密码策略** - 数据库密码和应用密钥要足够复杂
6. **备份策略** - 建立完善的备份和恢复机制

---

## 快速部署命令

```bash
# 一键部署脚本
chmod +x deploy.sh
./deploy.sh
```

部署完成后访问: `http://your-server-ip:3000`
