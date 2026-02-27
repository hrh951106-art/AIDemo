import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { projectSchema } from '@/lib/validations/project'

// GET /api/projects - 获取当前用户的所有项目
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {
      userId: session.user.id,
    }

    if (status) {
      where.status = status
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: { tasks: true },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 为每个项目计算实际工时
    const projectsWithHours = await Promise.all(
      projects.map(async (project) => {
        const timeEntries = await prisma.timeEntry.findMany({
          where: { projectId: project.id },
        })

        const actualHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0)

        return {
          ...project,
          actualHours,
          taskCount: project.tasks.length,
          completedTasks: project.tasks.filter((t) => t.status === 'DONE').length,
        }
      })
    )

    return NextResponse.json(projectsWithHours)
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { error: '获取项目失败' },
      { status: 500 }
    )
  }
}

// POST /api/projects - 创建新项目
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // 验证输入
    const validatedData = projectSchema.parse(body)

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        userId: session.user.id,
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error: any) {
    console.error('Create project error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '创建项目失败' },
      { status: 500 }
    )
  }
}
