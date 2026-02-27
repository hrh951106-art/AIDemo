# ===========================================
# Multi-stage Dockerfile for Next.js
# ===========================================

# ===========================================
# Stage 1: Dependencies
# ===========================================
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# ===========================================
# Stage 2: Builder
# ===========================================
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# ===========================================
# Stage 3: Runner (Production)
# ===========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]

# ===========================================
# 使用说明:
# ===========================================
# 1. 构建镜像:
#    docker build -t project-management:latest .
#
# 2. 运行容器:
#    docker run -d \
#      --name project-management \
#      -p 3000:3000 \
#      --env-file .env.production \
#      project-management:latest
#
# 3. 使用 docker-compose:
#    docker-compose up -d
#
# 4. 查看日志:
#    docker logs -f project-management
# ===========================================
