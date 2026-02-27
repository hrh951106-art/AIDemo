# 生产环境部署指南

## 构建状态

✅ **构建成功** - 所有组件编译通过
✅ **TypeScript 检查通过** - 无类型错误
✅ **字体文件已集成** - 本地 Web 字体配置完成
✅ **数据库已配置** - PostgreSQL 配置就绪

---

## 部署架构

项目使用 **Next.js Standalone 模式**，此模式优化了生产环境的部署：

### 目录结构

```
项目根目录/
├── .next/                    # Next.js 构建产物
│   ├── static/              # 静态资源（JS、CSS）
│   └── server/              # 服务器端文件
├── .next/standalone/        # 独立运行包（最小化依赖）
│   ├── node_modules/        # 仅包含必需的生产依赖
│   └── server.js            # 服务器入口
├── public/                  # 静态文件（重要！）
│   └── fonts/              # ✅ Web 字体文件（1.06 MB）
├── prisma/                  # 数据库相关
│   └── schema.prisma        # 数据库模型
├── package.json             # 依赖配置
└── .next/standalone/        # 部署目标
```

---

## 快速部署（Docker Compose）

最简单快速的部署方式：

\`\`\`bash
# 1. 构建并启动
docker-compose up -d

# 2. 运行数据库迁移
docker-compose exec app npx prisma migrate deploy

# 3. 访问应用
http://localhost:3000
\`\`\`

创建 `docker-compose.yml`:

\`\`\`yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: project_manager
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: project_management
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://project_manager:your_password@postgres:5432/project_management"
      NEXTAUTH_URL: "http://localhost:3000"
      NEXTAUTH_SECRET: "your-super-secret-key-change-this"
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
\`\`\`

---

## 字体文件说明

### 字体文件位置

\`\`\`
public/fonts/
├── AlibabaPuHuiTi-3-Regular.woff2 (292 KB)
├── AlibabaPuHuiTi-3-Medium.woff2  (292 KB)
├── AlibabaPuHuiTi-3-Bold.woff2    (292 KB)
├── JetBrainsMono-Regular.woff2    (90 KB)
└── JetBrainsMono-Bold.woff2       (92 KB)
\`\`\`

**重要**: 部署时必须复制整个 `public/` 目录，否则字体无法加载！

---

## 环境变量配置

创建 `.env` 文件：

\`\`\`bash
# 数据库
DATABASE_URL="postgresql://project_manager:password@localhost:5432/project_management"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"  # 生产环境改为实际域名
NEXTAUTH_SECRET="生成方法: openssl rand -base64 32"

# 运行环境
NODE_ENV="production"
\`\`\`

生成 NEXTAUTH_SECRET:
\`\`\`bash
openssl rand -base64 32
\`\`\`

---

## 常见问题

### Q: 字体不显示怎么办？
**A**: 确认以下内容：
1. `public/fonts/` 目录已复制到服务器
2. 文件权限正确（644）
3. 浏览器控制台没有 404 错误

### Q: 数据库连接失败？
**A**:
1. 检查 PostgreSQL 是否运行：`sudo systemctl status postgresql`
2. 验证连接字符串格式
3. 确认数据库用户权限

---

## 更多信息

详细的部署选项（PM2、Nginx 等）请参考项目根目录的完整部署文档。
