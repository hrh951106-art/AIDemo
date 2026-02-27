# 404 错误快速修复指南

## 问题
部署后访问网站显示 404 错误

## ✅ 快速修复（推荐）

### 方法 1: 使用自动化部署脚本（最简单）

```bash
# 1. 在项目根目录运行
sudo ./deploy-production.sh

# 2. 修改环境变量
sudo nano /opt/project-management-system/.env
# 修改 DATABASE_URL、NEXTAUTH_URL、NEXTAUTH_SECRET

# 3. 重启服务
sudo systemctl restart project-management

# 4. 检查状态
sudo systemctl status project-management
```

### 方法 2: 手动部署

```bash
# 1. 停止现有服务
sudo systemctl stop project-management 2>/dev/null || true

# 2. 创建部署目录
sudo mkdir -p /opt/project-management-system

# 3. 复制文件
sudo cp -r .next /opt/project-management-system/
sudo cp -r public /opt/project-management-system/
sudo cp -r prisma /opt/project-management-system/
sudo cp -r node_modules/.prisma /opt/project-management-system/node_modules/
sudo cp package.json /opt/project-management-system/

# 4. 运行数据库迁移
cd /opt/project-management-system
sudo npx prisma migrate deploy

# 5. 启动服务
NODE_ENV=production sudo -u nodejs npx next start
```

---

## 🔍 诊断问题

运行诊断脚本：

```bash
./diagnose.sh
```

或手动检查：

```bash
# 1. 检查服务是否运行
sudo systemctl status project-management

# 2. 检查端口
lsof -i :3000

# 3. 测试连接
curl http://localhost:3000/api/health

# 4. 查看日志
sudo journalctl -u project-management -f
```

---

## 📝 关键配置检查

### 1. 环境变量 (.env)

```bash
# 必须配置的变量
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
NEXTAUTH_URL="http://your-domain.com"  # 或 http://localhost:3000
NEXTAUTH_SECRET="your-random-secret-key"
NODE_ENV="production"
```

生成 NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 2. 数据库连接

```bash
# 测试 PostgreSQL 连接
psql -U project_manager -d project_management -h localhost

# 运行迁移
npx prisma migrate deploy
```

### 3. 文件结构

确保以下文件存在：

```
/opt/project-management-system/
├── .next/
│   ├── static/         # 必须
│   └── server.js       # 必须
├── public/
│   └── fonts/          # 必须（5个 woff2 文件）
├── prisma/
│   └── schema.prisma   # 必须
├── node_modules/
│   └── .prisma/        # 必须
└── .env                # 必须
```

---

## 🚨 常见问题和解决方案

### 问题 1: 端口被占用

**症状**: 无法启动服务

**解决**:
```bash
# 查找占用进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改端口
export PORT=3001
```

### 问题 2: 字体不显示

**症状**: 页面显示但字体不正确

**解决**:
```bash
# 检查字体文件
ls -la /opt/project-management-system/public/fonts/

# 应该有 5 个 woff2 文件
# 如果缺失，重新复制
sudo cp -r public/fonts /opt/project-management-system/public/
```

### 问题 3: 数据库连接失败

**症状**: API 返回 500 错误

**解决**:
```bash
# 1. 检查 PostgreSQL
sudo systemctl status postgresql

# 2. 测试连接
psql -U project_manager -d project_management

# 3. 检查 .env 中的 DATABASE_URL
sudo nano /opt/project-management-system/.env

# 4. 运行迁移
cd /opt/project-management-system
npx prisma migrate deploy
```

### 问题 4: NextAuth 配置错误

**症状**: 登录后跳转失败

**解决**:
```bash
# 1. 检查 NEXTAUTH_URL
# 生产环境必须是实际域名，不能是 localhost

# 2. 生成新的 SECRET
openssl rand -base64 32

# 3. 更新 .env
sudo nano /opt/project-management-system/.env

# 4. 重启服务
sudo systemctl restart project-management
```

### 问题 5: 权限问题

**症状**: 日志显示 "EACCES" 或 "EPERM"

**解决**:
```bash
# 设置正确的所有者
sudo chown -R nodejs:nodejs /opt/project-management-system

# 设置正确的权限
sudo chmod -R 755 /opt/project-management-system
```

---

## 🔧 手动启动（调试用）

如果 systemd 服务有问题，可以手动启动查看错误：

```bash
cd /opt/project-management-system

# 以 nodejs 用户身份启动
sudo -u nodejs bash
export $(cat .env | xargs)
npx next start

# 或者直接以当前用户
NODE_ENV=production npx next start
```

---

## 📞 仍然无法解决？

1. **收集日志**:
   ```bash
   sudo journalctl -u project-management -n 100 > logs.txt
   ```

2. **检查构建**:
   ```bash
   npm run build
   # 查看是否有错误
   ```

3. **本地测试**:
   ```bash
   npm run start
   # 访问 http://localhost:3000
   ```

4. **重新部署**:
   ```bash
   sudo ./deploy-production.sh
   ```

---

## ✅ 成功标志

部署成功后，你应该看到：

1. ✓ 服务状态: `active (running)`
2. ✓ HTTP 200: 访问根路径返回 200
3. ✓ API 正常: `/api/health` 返回 `{"status":"ok"}`
4. ✓ 字体加载: 浏览器开发工具 Network 标签看到 woff2 文件加载成功
5. ✓ 数据库连接: 可以注册和登录用户

祝部署顺利！🎉
