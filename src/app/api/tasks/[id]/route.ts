import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { taskUpdateSchema } from '@/lib/validations/task'

// GET /api/tasks/:id - 获取单个任务详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const { id } = await params

    const task = await prisma.task.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
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

    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json(
      { error: '获取任务失败' },
      { status: 500 }
    )
  }
}

// PUT /api/tasks/:id - 更新任务
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const { id } = await params

    // 检查任务是否存在且属于当前用户
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // 验证输入
    const validatedData = taskUpdateSchema.parse(body)

    const task = await prisma.task.update({
      where: {
        id,
      },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        priority: validatedData.priority,
        status: validatedData.status,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        projectId: validatedData.projectId === 'none' || !validatedData.projectId ? null : validatedData.projectId,
        estimatedHours: validatedData.estimatedHours ? parseFloat(validatedData.estimatedHours) : null,
        assignedUserId: validatedData.assignedUserId === 'none' || !validatedData.assignedUserId ? null : validatedData.assignedUserId,
      },
    })

    return NextResponse.json(task)
  } catch (error: any) {
    console.error('Update task error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '更新任务失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/:id - 删除任务
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const { id } = await params

    // 检查任务是否存在且属于当前用户
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      )
    }

    await prisma.task.delete({
      where: {
        id,
      },
    })

    return NextResponse.json(
      { message: '任务删除成功' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: '删除任务失败' },
      { status: 500 }
    )
  }
}
