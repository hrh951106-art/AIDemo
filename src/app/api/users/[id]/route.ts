import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const userUpdateSchema = z.object({
  name: z.string().min(1, '姓名不能为空').optional(),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  password: z.string().min(6, '密码至少6个字符').optional(),
})

// GET /api/users/[id] - 获取单个用户详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 序列化日期
    const serializedUser = {
      ...user,
      createdAt: user.createdAt.toISOString(),
    }

    return NextResponse.json(serializedUser)
  } catch (error) {
    console.error('获取用户详情失败:', error)
    return NextResponse.json({ error: '获取用户详情失败' }, { status: 500 })
  }
}

// PUT /api/users/[id] - 更新用户信息
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const body = await request.json()

    // 验证输入
    const validatedData = userUpdateSchema.parse(body)

    // 如果要更新邮箱，检查新邮箱是否已被其他用户使用
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: id },
        },
      })

      if (emailExists) {
        return NextResponse.json({ error: '该邮箱已被使用' }, { status: 400 })
      }
    }

    // 准备更新数据
    const updateData: any = {
      ...(validatedData.name && { name: validatedData.name }),
      ...(validatedData.email && { email: validatedData.email }),
    }

    // 如果提供了新密码，则加密密码
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 10)
    }

    // 更新用户
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        createdAt: true,
      },
    })

    // 序列化日期
    const serializedUser = {
      ...user,
      createdAt: user.createdAt.toISOString(),
    }

    return NextResponse.json(serializedUser)
  } catch (error: any) {
    console.error('更新用户失败:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
}

// DELETE /api/users/[id] - 删除用户
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    // 不能删除自己
    if (id === session.user.id) {
      return NextResponse.json({ error: '不能删除自己的账户' }, { status: 400 })
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 删除用户（级联删除相关数据）
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ message: '用户删除成功' })
  } catch (error) {
    console.error('删除用户失败:', error)
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 })
  }
}
