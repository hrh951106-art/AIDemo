import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const timeEntrySchema = z.object({
  hours: z.number().positive('工时必须大于0'),
  description: z.string().nullable().optional(),
})

// GET /api/tasks/[id]/time-entries - 获取任务的所有工时记录
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const entries = await prisma.timeEntry.findMany({
      where: {
        taskId: params.id,
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('获取工时记录失败:', error)
    return NextResponse.json({ error: '获取工时记录失败' }, { status: 500 })
  }
}

// POST /api/tasks/[id]/time-entries - 创建工时记录
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = timeEntrySchema.parse(body)

    // 验证任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        project: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    // 如果任务关联了项目，需要获取项目ID
    const projectId = task.projectId || task.project?.id

    // 如果没有关联项目，创建一个默认项目
    let finalProjectId = projectId
    if (!finalProjectId) {
      const defaultProject = await prisma.project.findFirst({
        where: {
          userId: session.user.id,
          name: '默认项目',
        },
      })

      if (defaultProject) {
        finalProjectId = defaultProject.id
      } else {
        const newProject = await prisma.project.create({
          data: {
            name: '默认项目',
            userId: session.user.id,
          },
        })
        finalProjectId = newProject.id
      }
    }

    const entry = await prisma.timeEntry.create({
      data: {
        hours: validatedData.hours,
        description: validatedData.description,
        taskId: params.id,
        userId: session.user.id,
        projectId: finalProjectId,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('创建工时记录失败:', error)
    return NextResponse.json({ error: '创建工时记录失败' }, { status: 500 })
  }
}
