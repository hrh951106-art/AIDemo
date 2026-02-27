import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { commentSchema } from '@/lib/validations/project'

// GET /api/tasks/:taskId/comments - 获取任务的所有评论
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { taskId } = await params

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}

// POST /api/tasks/:taskId/comments - 创建新评论
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { taskId } = await params
    const body = await request.json()

    // 验证输入
    const validatedData = commentSchema.parse(body)

    // 验证任务是否存在
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    // 创建评论
    const comment = await prisma.comment.create({
      data: {
        content: validatedData.content,
        taskId,
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

    // 处理 @提及
    if (validatedData.mentions && validatedData.mentions.length > 0) {
      const mentions = await Promise.all(
        validatedData.mentions.map((mentionedUserId) =>
          prisma.mention.create({
            data: {
              commentId: comment.id,
              mentionedUserId,
            },
            include: {
              mentionedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          })
        )
      )

      // 创建提及通知
      await Promise.all(
        mentions.map((mention) =>
          prisma.notification.create({
            data: {
              userId: mention.mentionedUserId,
              type: 'MENTION',
              content: `${session.user?.name || '有人'}在任务"${task.title}"中提到了您`,
              relatedId: comment.id,
              relatedType: 'COMMENT',
            },
          })
        )
      )
    }

    // 如果不是自己的任务，通知任务创建者
    if (task.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: task.userId,
          type: 'COMMENT',
          content: `${session.user?.name || '有人'}评论了您的任务"${task.title}"`,
          relatedId: comment.id,
          relatedType: 'COMMENT',
        },
      })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error: any) {
    console.error('Create comment error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    return NextResponse.json({ error: '创建评论失败' }, { status: 500 })
  }
}
