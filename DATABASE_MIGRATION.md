# 数据库迁移指南：从 SQLite 到 PostgreSQL

## 概述

本项目已将数据库从 SQLite 迁移到 PostgreSQL，以获得更好的性能和扩展性。

## 迁移步骤

### 1. 安装 PostgreSQL

确保您的服务器已安装 PostgreSQL：

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**CentOS/RHEL:**
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Docker:**
```bash
docker run --name postgres-db \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=project_management \
  -p 5432:5432 \
  -d postgres:16
```

### 2. 创建数据库和用户

```bash
# 连接到 PostgreSQL
sudo -u postgres psql

# 在 PostgreSQL 命令行中执行：
CREATE USER project_manager WITH PASSWORD 'your_secure_password';
CREATE DATABASE project_management OWNER project_manager;
GRANT ALL PRIVILEGES ON DATABASE project_management TO project_manager;
\q
```

### 3. 配置环境变量

更新 `.env` 文件中的 `DATABASE_URL`：

```env
# PostgreSQL 连接字符串
DATABASE_URL="postgresql://project_manager:your_secure_password@localhost:5432/project_management"

# 其他配置...
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

**连接字符串格式：**
```
postgresql://用户名:密码@主机:端口/数据库名
```

### 4. 运行数据库迁移

```bash
# 生成迁移文件（如果需要）
npx prisma migrate dev --name init_postgresql

# 或者在生产环境中：
npx prisma migrate deploy
```

### 5. 重新生成 Prisma Client

```bash
npx prisma generate
```

### 6. 验证连接

```bash
# 测试数据库连接
npx prisma db push

# 查看 Prisma Studio（可选）
npx prisma studio
```

## 从 SQLite 迁移现有数据

如果您有现有的 SQLite 数据需要迁移：

### 方法 1：使用 Prisma 导出/导入

```bash
# 1. 从 SQLite 导出数据
npx prisma db pull  # 确保连接的是 SQLite

# 2. 将 SQLite 数据导出为 SQL
sqlite3 dev.db .dump > backup.sql

# 3. 切换到 PostgreSQL 并导入
psql -U project_manager -d project_management -f backup.sql
```

### 方法 2：使用脚本迁移

创建迁移脚本 `scripts/migrate-data.ts`：

```typescript
import { PrismaClient } from '@prisma/client'

const sqlitePrisma = new PrismaClient({
  datasources: {
    db: { url: 'file:./dev.db' }
  }
})

const pgPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.POSTGRES_URL }
  }
})

async function migrateData() {
  // 迁移用户
  const users = await sqlitePrisma.user.findMany()
  await pgPrisma.user.createMany({
    data: users
  })

  // 迁移其他表...
}

migrateData()
```

## 生产环境配置

### 连接池配置

在 `prisma/schema.prisma` 中添加连接池配置：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // 连接池配置
  directUrl = env("DIRECT_URL") // 用于迁移的连接字符串
}
```

### 环境变量示例

```env
# 应用连接（使用连接池）
DATABASE_URL="postgresql://project_manager:password@localhost:5432/project_management?pgbouncer=true"

# 直连（用于迁移）
DIRECT_URL="postgresql://project_manager:password@localhost:5432/project_management"
```

## 性能优化

### 1. 启用查询缓存

```bash
# 安装 Prisma Accelerate（可选）
npx prisma accelerator
```

### 2. 数据库索引

已包含的索引（在 `schema.prisma` 中）：
- `User.email` - 唯一索引
- `Task.userId, status` - 复合索引
- `Task.projectId` - 外键索引
- `Task.assignedUserId` - 外键索引
- 等等...

### 3. 连接池大小

根据您的服务器配置调整连接池：

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

## 常见问题

### Q: 迁移时出现 "database is locked" 错误

**A:** 确保 SQLite 没有被其他进程占用：
```bash
lsof dev.db
kill -9 <PID>
```

### Q: PostgreSQL 连接失败

**A:** 检查：
1. PostgreSQL 服务是否运行
2. 防火墙是否开放 5432 端口
3. `pg_hba.conf` 配置是否允许连接
4. 用户权限是否正确

### Q: 字符编码问题

**A:** 确保数据库使用 UTF-8 编码：
```sql
ALTER DATABASE project_management ENCODING 'UTF8';
```

## 回滚到 SQLite

如果需要回滚到 SQLite：

1. 更新 `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

2. 更新 `.env`:
```env
DATABASE_URL="file:./dev.db"
```

3. 重新生成和迁移：
```bash
npx prisma generate
npx prisma migrate reset
```

## 注意事项

⚠️ **重要提示：**
- 生产环境迁移前务必备份数据
- 建议在测试环境先进行迁移测试
- PostgreSQL 连接字符串中的密码需要 URL 编码（如 `#` 变为 `%23`）
- 确保服务器有足够的内存和存储空间

## 性能对比

| 特性 | SQLite | PostgreSQL |
|------|--------|------------|
| 并发写入 | ❌ 差 | ✅ 优秀 |
| 数据完整性 | ⚠️ 基本 | ✅ 强大 |
| 全文搜索 | ❌ 不支持 | ✅ 支持 |
| JSON 支持 | ⚠️ 有限 | ✅ 完善 |
| 连接池 | N/A | ✅ 支持 |
| 复杂查询 | ⚠️ 有限 | ✅ 强大 |

## 更多信息

- [Prisma PostgreSQL 文档](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [Next.js 生产环境部署](https://nextjs.org/docs/deployment)
