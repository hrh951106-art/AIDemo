import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validations/task'

// GET /api/tasks - 获取当前用户的所有任务
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
    const priority = searchParams.get('priority')

    // 构建查询条件 - 显示分配给我 或 我创建的任务
    const baseConditions = [
      { assignedUserId: session.user.id },
      { userId: session.user.id },
    ]

    const where: any = {
      OR: baseConditions,
    }

    // 添加筛选条件（需要应用到OR的每个分支）
    if (status || priority) {
      const filters: any[] = []
      if (status) filters.push({ status })
      if (priority) filters.push({ priority })

      // 将每个筛选条件应用到OR的每个分支
      where.OR = baseConditions.map((condition) => ({
        ...condition,
        AND: filters,
      }))
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: '获取任务失败' },
      { status: 500 }
    )
  }
}

// POST /api/tasks - 创建新任务
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

    console.log('创建任务请求数据:', body)
    console.log('projectId类型:', typeof body.projectId, 'projectId值:', body.projectId)
    console.log('assignedUserId类型:', typeof body.assignedUserId, 'assignedUserId值:', body.assignedUserId)

    // 验证输入
    let validatedData
    try {
      validatedData = taskSchema.parse(body)
      console.log('验证后的数据:', validatedData)
    } catch (zodError: any) {
      console.error('Zod验证失败:', zodError)
      console.error('Zod错误详情:', zodError.errors)
      return NextResponse.json(
        { error: zodError.errors?.[0]?.message || '表单验证失败' },
        { status: 400 }
      )
    }

    console.log('验证后projectId:', validatedData.projectId, '类型:', typeof validatedData.projectId)
    console.log('验证后assignedUserId:', validatedData.assignedUserId, '类型:', typeof validatedData.assignedUserId)

    // 准备任务数据 - 清理undefined和空字符串
    const taskData: any = {
      title: validatedData.title,
      description: validatedData.description || null,
      priority: validatedData.priority || 'MEDIUM',
      status: validatedData.status || 'TODO',
      userId: session.user.id,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
    }

    // 只有当projectId是有效字符串时才添加
    if (validatedData.projectId && validatedData.projectId !== 'none' && validatedData.projectId.trim() !== '') {
      taskData.projectId = validatedData.projectId
    }

    // 只有当estimatedHours是有效字符串时才添加
    if (validatedData.estimatedHours && validatedData.estimatedHours.trim() !== '') {
      taskData.estimatedHours = parseFloat(validatedData.estimatedHours)
    }

    // 只有当assignedUserId是有效字符串时才添加
    if (validatedData.assignedUserId && validatedData.assignedUserId !== 'none' && validatedData.assignedUserId.trim() !== '') {
      taskData.assignedUserId = validatedData.assignedUserId
    }

    console.log('准备创建的任务数据:', taskData)

    const task = await prisma.task.create({
      data: taskData,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    console.log('任务创建成功:', task)

    return NextResponse.json(task, { status: 201 })
  } catch (error: any) {
    console.error('Create task error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || '创建任务失败' },
      { status: 500 }
    )
  }
}
