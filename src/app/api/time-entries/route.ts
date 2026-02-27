import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { timeEntrySchema } from '@/lib/validations/project'

// GET /api/time-entries - 获取工时记录
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const projectId = searchParams.get('projectId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    // 只能查看自己的工时记录，或者自己项目/任务的工时
    const userProjects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    })

    const userProjectIds = userProjects.map((p) => p.id)

    where.OR = [
      { userId: session.user.id },
      { projectId: { in: userProjectIds } },
    ]

    if (taskId) where.taskId = taskId
    if (projectId) where.projectId = projectId
    if (startDate) where.date = { ...where.date, gte: new Date(startDate) }
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) }

    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(timeEntries)
  } catch (error) {
    console.error('Get time entries error:', error)
    return NextResponse.json({ error: '获取工时记录失败' }, { status: 500 })
  }
}

// POST /api/time-entries - 创建工时记录
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await request.json()

    // 验证输入
    const validatedData = timeEntrySchema.parse(body)

    // 验证任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: validatedData.taskId },
      include: { project: true },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    // 创建工时记录
    const timeEntry = await prisma.timeEntry.create({
      data: {
        ...validatedData,
        date: new Date(validatedData.date),
        userId: session.user.id,
      },
    })

    return NextResponse.json(timeEntry, { status: 201 })
  } catch (error: any) {
    console.error('Create time entry error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    return NextResponse.json({ error: '创建工时记录失败' }, { status: 500 })
  }
}
