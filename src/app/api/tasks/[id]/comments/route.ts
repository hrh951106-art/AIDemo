import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const commentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空'),
  mentionedUserIds: z.array(z.string()).optional().default([]),
})

// GET /api/tasks/[id]/comments - 获取任务的所有评论
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const comments = await prisma.comment.findMany({
      where: {
        taskId: params.id,
      },
      include: {
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

    return NextResponse.json(comments)
  } catch (error) {
    console.error('获取评论失败:', error)
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}

// POST /api/tasks/[id]/comments - 创建评论
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
    const validatedData = commentSchema.parse(body)

    // 验证任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        taskId: params.id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 创建提及关系
    if (validatedData.mentionedUserIds.length > 0) {
      const mentions = await prisma.mention.createMany({
        data: validatedData.mentionedUserIds.map((userId) => ({
          commentId: comment.id,
          mentionedUserId: userId,
        })),
      })

      // 为每个被提及的用户创建通知
      await Promise.all(
        validatedData.mentionedUserIds.map((userId) =>
          prisma.notification.create({
            data: {
              type: 'MENTION',
              content: `${session.user.name} 在评论中提到了你`,
              userId,
              relatedId: comment.id,
              relatedType: 'COMMENT',
            },
          })
        )
      )
    }

    // 创建通知（如果评论者不是任务创建者）
    if (task.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          type: 'COMMENT',
          content: `${session.user.name} 评论了你的任务：${task.title}`,
          userId: task.userId,
          relatedId: task.id,
          relatedType: 'TASK',
        },
      })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('创建评论失败:', error)
    return NextResponse.json({ error: '创建评论失败' }, { status: 500 })
  }
}
