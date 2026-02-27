# 数据库配置说明

本项目支持两种数据库配置：
- **本地开发**: SQLite（简单，无需安装数据库服务）
- **生产环境**: PostgreSQL（高性能，适合生产）

---

## 📁 相关文件

### 本地开发（SQLite）
```
├── .env                    # 开发环境配置（SQLite）
├── dev.db                  # SQLite 数据库文件
├── prisma/
│   └── schema.prisma       # 数据库模型定义
└── start-dev.sh            # 开发环境启动脚本
```

### 生产环境（PostgreSQL）
```
├── .env.production         # 生产环境配置模板
├── docker-compose.prod.yml # Docker Compose 配置
├── Dockerfile              # 应用 Docker 镜像
├── deploy-docker.sh        # Docker 部署脚本
├── backup-production-db.sh # 数据库备份脚本
├── restore-production-db.sh# 数据库恢复脚本
└── DEPLOYMENT_POSTGRESQL.md # 部署文档
```

---

## 🚀 快速开始

### 本地开发（SQLite）

```bash
# 1. 安装依赖
npm install

# 2. 生成 Prisma Client
npx prisma generate

# 3. 运行开发服务器
npm run dev
```

访问 http://localhost:3000

### 生产部署（PostgreSQL）

```bash
# 1. 编辑生产环境配置
nano .env.production

# 2. 运行部署脚本
./deploy-docker.sh
```

---

## 🔄 切换数据库类型

### 从 SQLite 切换到 PostgreSQL

```bash
# 1. 修改 Prisma schema
# 将 prisma/schema.prisma 中的 provider 从 "sqlite" 改为 "postgresql"

# 2. 更新 .env 文件
# 将 DATABASE_URL 改为 PostgreSQL 连接字符串

# 3. 重新生成 Prisma Client
npx prisma generate

# 4. 运行迁移
npx prisma migrate deploy
```

### 从 PostgreSQL 切换到 SQLite

```bash
# 1. 修改 Prisma schema
# 将 prisma/schema.prisma 中的 provider 从 "postgresql" 改为 "sqlite"

# 2. 更新 .env 文件
# 将 DATABASE_URL 改为 "file:./dev.db"

# 3. 重新生成 Prisma Client
npx prisma generate

# 4. 推送 schema
npx prisma db push
```

---

## 📊 数据库管理工具

### Prisma Studio（可视化工具）

```bash
# 启动 Prisma Studio
npx prisma studio
```

访问 http://localhost:5555 查看和编辑数据。

### 命令行操作

```bash
# SQLite
sqlite3 dev.db "SELECT * FROM User;"

# PostgreSQL (Docker)
docker exec -it project-management-postgres psql -U postgres -d project_management
```

---

## 💾 数据备份

### SQLite

```bash
# 备份
cp dev.db dev.db.backup

# 恢复
cp dev.db.backup dev.db
```

### PostgreSQL

```bash
# 使用备份脚本
./backup-production-db.sh

# 恢复
./restore-production-db.sh ./backups/backup_file.sql.gz
```

---

## 🔧 常用 Prisma 命令

```bash
# 生成 Prisma Client
npx prisma generate

# 推送 schema 到数据库（开发环境）
npx prisma db push

# 创建迁移
npx prisma migrate dev --name migration_name

# 应用迁移（生产环境）
npx prisma migrate deploy

# 重置数据库
npx prisma migrate reset

# 查看 Prisma Studio
npx prisma studio

# 格式化 schema 文件
npx prisma format
```

---

## 📖 更多信息

- Prisma 文档: https://www.prisma.io/docs
- SQLite 文档: https://www.sqlite.org/docs.html
- PostgreSQL 文档: https://www.postgresql.org/docs/

---

## ⚠️ 注意事项

1. **本地开发**: 使用 SQLite，简单快速
2. **生产环境**: 使用 PostgreSQL，性能更好
3. **数据备份**: 生产环境必须定期备份
4. **密码安全**: 生产环境使用强密码
5. **环境隔离**: 开发和生产使用不同的数据库
