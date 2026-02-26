import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/tasks/[id]/comments/[commentId] - 删除评论
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 查找评论
    const comment = await prisma.comment.findUnique({
      where: { id: params.commentId },
    })

    if (!comment) {
      return NextResponse.json({ error: '评论不存在' }, { status: 404 })
    }

    // 验证权限：只有评论创建者可以删除
    if (comment.userId !== session.user.id) {
      return NextResponse.json({ error: '无权删除此评论' }, { status: 403 })
    }

    // 删除评论（会自动删除相关的 mentions）
    await prisma.comment.delete({
      where: { id: params.commentId },
    })

    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    console.error('删除评论失败:', error)
    return NextResponse.json({ error: '删除评论失败' }, { status: 500 })
  }
}
