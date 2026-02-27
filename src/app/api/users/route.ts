import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// 用户创建/更新验证schema
const userSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符').optional(),
})

// GET /api/users - 获取所有用户或搜索用户
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    console.log('Session:', session ? '已登录' : '未登录')

    if (!session?.user) {
      console.log('返回401错误')
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const all = searchParams.get('all') === 'true'

    console.log('GET /api/users - query:', query, 'all:', all)

    // 如果是获取所有用户（用于用户管理页面）
    if (all) {
      console.log('开始查询用户列表...')
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      console.log('成功查询用户列表，数量:', users.length)

      // 序列化日期
      const serializedUsers = users.map(user => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
      }))

      console.log('返回用户数据')
      return NextResponse.json(serializedUsers)
    }

    // 如果有搜索查询（用于@提及）
    if (query) {
      const users = await prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: query } },
                { email: { contains: query } },
              ],
            },
            {
              id: { not: session.user.id },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: 10,
      })
      return NextResponse.json(users)
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error('获取用户失败:', error)
    console.error('错误类型:', error.name)
    console.error('错误消息:', error.message)
    return NextResponse.json({ error: '获取用户失败: ' + error.message }, { status: 500 })
  }
}

// POST /api/users - 创建新用户
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()

    console.log('创建用户请求数据:', body)

    // 验证输入
    const validatedData = userSchema.parse(body)

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      console.log('邮箱已存在:', validatedData.email)
      return NextResponse.json({ error: '该邮箱已被使用' }, { status: 400 })
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(validatedData.password || '123456', 10)

    console.log('准备创建用户:', { name: validatedData.name, email: validatedData.email })

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
        password: true,
        createdAt: true,
      },
    })

    console.log('用户创建成功:', user)

    // 序列化日期
    const serializedUser = {
      ...user,
      createdAt: user.createdAt.toISOString(),
    }

    return NextResponse.json(serializedUser, { status: 201 })
  } catch (error: any) {
    console.error('创建用户失败:', error)

    if (error.name === 'ZodError') {
      console.error('Zod验证错误:', error.issues)
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
  }
}
