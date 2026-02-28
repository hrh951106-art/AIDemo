import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const statusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
})

// PATCH /api/tasks/:id/status - 更新任务状态
export async function PATCH(
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
    const validatedData = statusSchema.parse(body)

    const task = await prisma.task.update({
      where: {
        id,
      },
      data: {
        status: validatedData.status,
      },
    })

    // 如果任务状态发生变化，通知被分配的用户（如果他们不是更新者）
    if (validatedData.status !== existingTask.status) {
      if (task.assignedUserId && task.assignedUserId !== session.user.id) {
        const statusText = {
          'TODO': '待办',
          'IN_PROGRESS': '进行中',
          'DONE': '已完成',
        }[validatedData.status] || validatedData.status

        await prisma.notification.create({
          data: {
            type: 'TASK_UPDATE',
            content: `${session.user.name} 将任务"${task.title}"的状态更新为"${statusText}"`,
            userId: task.assignedUserId,
            relatedId: task.id,
            relatedType: 'TASK',
          },
        })
      }

      // 如果更新者不是任务创建者，也通知任务创建者
      if (task.userId !== session.user.id && task.userId !== task.assignedUserId) {
        const statusText = {
          'TODO': '待办',
          'IN_PROGRESS': '进行中',
          'DONE': '已完成',
        }[validatedData.status] || validatedData.status

        await prisma.notification.create({
          data: {
            type: 'TASK_UPDATE',
            content: `${session.user.name} 将任务"${task.title}"的状态更新为"${statusText}"`,
            userId: task.userId,
            relatedId: task.id,
            relatedType: 'TASK',
          },
        })
      }
    }

    return NextResponse.json(task)
  } catch (error: any) {
    console.error('Update task status error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '更新任务状态失败' },
      { status: 500 }
    )
  }
}
