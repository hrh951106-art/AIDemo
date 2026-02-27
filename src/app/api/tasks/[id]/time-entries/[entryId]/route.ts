import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/tasks/[id]/time-entries/[entryId] - 删除工时记录
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { entryId } = await params

    // 查找工时记录
    const entry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
    })

    if (!entry) {
      return NextResponse.json({ error: '工时记录不存在' }, { status: 404 })
    }

    // 验证权限：只有记录创建者可以删除
    if (entry.userId !== session.user.id) {
      return NextResponse.json({ error: '无权删除此记录' }, { status: 403 })
    }

    // 删除工时记录
    await prisma.timeEntry.delete({
      where: { id: entryId },
    })

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除工时记录失败:', error)
    return NextResponse.json({ error: '删除工时记录失败' }, { status: 500 })
  }
}
