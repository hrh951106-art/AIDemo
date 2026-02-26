import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/notifications/[id] - 标记单个通知为已读
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const notification = await prisma.notification.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('标记通知失败:', error)
    return NextResponse.json({ error: '标记通知失败' }, { status: 500 })
  }
}

// DELETE /api/notifications/[id] - 删除通知
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    await prisma.notification.delete({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除通知失败:', error)
    return NextResponse.json({ error: '删除通知失败' }, { status: 500 })
  }
}
