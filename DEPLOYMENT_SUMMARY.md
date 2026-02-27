# 部署问题修复总结

## ✅ 已完成的修复

### 1. 禁用 Standalone 模式
- **问题**: Standalone 模式生成的文件在完整项目路径下，导致部署路径错误
- **解决**: 在 `next.config.ts` 中注释掉 `output: 'standalone'`
- **结果**: 构建产物现在直接在 `.next/` 目录，便于部署

### 2. 重新构建项目
- **执行**: `npm run build`
- **状态**: ✅ 构建成功
- **大小**: .next 目录约 165 MB

### 3. 创建部署工具

#### 部署脚本 (`deploy-production.sh`)
- 自动化部署流程
- 创建 systemd 服务
- 配置环境变量
- 运行数据库迁移
- 设置文件权限

#### 诊断脚本 (`diagnose.sh`)
- 检查进程和端口
- 测试 HTTP 连接
- 验证文件结构
- 检查环境变量
- 显示系统日志

#### 文档
- `FIX_404_QUICK.md` - 快速修复指南
- `DEPLOYMENT.md` - 完整部署文档
- `TROUBLESHOOTING_404.md` - 故障排查指南

---

## 🚀 快速部署步骤

### 在服务器上执行：

```bash
# 1. 上传项目文件到服务器
# （使用 git clone、scp 或 sftp）

# 2. 进入项目目录
cd project-management-system

# 3. 运行部署脚本
sudo ./deploy-production.sh

# 4. 修改环境变量
sudo nano /opt/project-management-system/.env
# 修改以下配置：
#   - DATABASE_URL
#   - NEXTAUTH_URL（改为实际域名）
#   - NEXTAUTH_SECRET（运行 openssl rand -base64 32 生成）

# 5. 重启服务
sudo systemctl restart project-management

# 6. 检查状态
sudo systemctl status project-management
```

---

## 📋 部署检查清单

### 服务器准备
- [ ] Node.js 已安装 (v20+)
- [ ] PostgreSQL 已安装并运行
- [ ] 数据库和用户已创建
- [ ] 防火墙已开放 3000 端口

### 应用配置
- [ ] `.env` 文件已正确配置
- [ ] `DATABASE_URL` 指向正确的数据库
- [ ] `NEXTAUTH_URL` 设置为实际域名
- [ ] `NEXTAUTH_SECRET` 已设置为随机密钥

### 文件部署
- [ ] `.next/` 目录已复制
- [ ] `public/` 目录已复制（包含字体）
- [ ] `prisma/` 目录已复制
- [ ] `node_modules/.prisma/` 已复制

### 数据库
- [ ] PostgreSQL 服务运行中
- [ ] 数据库迁移已执行
- [ ] 数据库连接测试成功

### 服务
- [ ] systemd 服务已创建
- [ ] 服务已启动
- [ ] 服务设置为开机自启

---

## 🔍 测试部署

### 1. 本地测试

```bash
# 测试 API 健康检查
curl http://localhost:3000/api/health

# 应该返回:
# {"status":"ok","timestamp":"..."}
```

### 2. 浏览器测试

访问服务器地址：
```
http://your-server-ip:3000
```

应该看到：
- ✅ 首页正常显示
- ✅ 字体加载成功（阿里巴巴普惠体）
- ✅ 可以访问注册和登录页面
- ✅ 无 404 错误

### 3. 功能测试

- [ ] 注册新用户
- [ ] 登录系统
- [ ] 创建项目
- [ ] 创建任务
- [ ] 查看字体显示

---

## 📊 当前配置

### 应用配置
- **框架**: Next.js 16.1.6 (Turbopack)
- **运行时**: Node.js
- **数据库**: PostgreSQL
- **字体**: 本地 Web 字体（1.06 MB）

### 构建产物
- **.next 目录**: 165 MB
- **public 目录**: 包含字体文件
- **部署模式**: 标准 Next.js 部署

### 服务配置
- **端口**: 3000
- **用户**: nodejs
- **工作目录**: /opt/project-management-system
- **重启策略**: 自动重启

---

## 🛠️ 常用命令

### 服务管理
```bash
# 启动
sudo systemctl start project-management

# 停止
sudo systemctl stop project-management

# 重启
sudo systemctl restart project-management

# 查看状态
sudo systemctl status project-management

# 查看日志
sudo journalctl -u project-management -f
```

### 应用管理
```bash
# 运行数据库迁移
cd /opt/project-management-system
npx prisma migrate deploy

# 重新构建
npm run build

# 本地测试
npm run dev
```

### 诊断
```bash
# 运行诊断脚本
./diagnose.sh

# 检查端口
lsof -i :3000

# 检查进程
ps aux | grep node

# 测试连接
curl http://localhost:3000/api/health
```

---

## 📞 获取帮助

如果仍然遇到问题：

1. **查看日志**
   ```bash
   sudo journalctl -u project-management -n 100
   ```

2. **运行诊断**
   ```bash
   ./diagnose.sh
   ```

3. **查看文档**
   - `FIX_404_QUICK.md` - 快速修复
   - `DEPLOYMENT.md` - 完整部署指南
   - `TROUBLESHOOTING_404.md` - 故障排查

---

## ✨ 下次更新的步骤

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建
npm run build

# 3. 停止服务
sudo systemctl stop project-management

# 4. 复制新文件
sudo cp -r .next /opt/project-management-system/
sudo cp -r public /opt/project-management-system/
sudo cp -r prisma /opt/project-management-system/

# 5. 运行迁移（如有数据库变更）
cd /opt/project-management-system
npx prisma migrate deploy

# 6. 启动服务
sudo systemctl start project-management

# 7. 检查状态
sudo systemctl status project-management
```

---

部署愉快！🎉
