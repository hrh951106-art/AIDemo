import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/auth'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // 验证输入
    const validatedData = registerSchema.parse(body)

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validatedData.email,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    // 将 Date 对象转换为字符串以确保正确序列化
    const serializedUser = {
      ...user,
      createdAt: user.createdAt.toISOString(),
    }

    return NextResponse.json(
      {
        message: '注册成功',
        user: serializedUser,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)

    // 处理 Zod 验证错误
    if (error instanceof ZodError) {
      // 构建详细的错误信息对象
      const fieldErrors: Record<string, string> = {}
      error.errors.forEach((err) => {
        if (err.path.length > 0) {
          const field = err.path[0] as string
          fieldErrors[field] = err.message
        }
      })

      return NextResponse.json(
        {
          error: '表单验证失败',
          fieldErrors,
          errors: error.errors // 包含完整的错误详情
        },
        { status: 400 }
      )
    }

    // 处理 Prisma 错误
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code)

      // 唯一约束冲突
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: '该邮箱已被注册', fieldErrors: { email: '该邮箱已被注册' } },
          { status: 400 }
        )
      }
    }

    // 处理其他错误 - 不包含 undefined 值
    const errorMessage = error.message || '注册失败，请稍后重试'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
