import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/notifications/mark-all-read - 标记所有通知为已读
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    })

    return NextResponse.json({ message: '已标记所有通知为已读' })
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    return NextResponse.json({ error: '标记失败' }, { status: 500 })
  }
}
