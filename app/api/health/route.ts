import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 健康检查端点
 *
 * 用于负载均衡器、容器编排系统和监控工具检查应用健康状态
 *
 * 返回:
 * - 200: 应用和数据库正常
 * - 503: 应用或数据库异常
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        responseTime: `${responseTime}ms`,
        uptime: process.uptime(),
        memory: {
          used: `${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100} MB`,
          total: `${Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100} MB`,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}
