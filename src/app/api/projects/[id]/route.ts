import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { projectSchema } from '@/lib/validations/project'

// GET /api/projects/:id - 获取单个项目详情
export async function GET(
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

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        tasks: {
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
        },
        timeEntries: {
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
            date: 'desc',
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      )
    }

    // 计算实际工时
    const actualHours = project.timeEntries.reduce((sum, entry) => sum + entry.hours, 0)

    return NextResponse.json({
      ...project,
      actualHours,
    })
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { error: '获取项目失败' },
      { status: 500 }
    )
  }
}

// PUT /api/projects/:id - 更新项目
export async function PUT(
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

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // 验证输入
    const validatedData = projectSchema.parse(body)

    const project = await prisma.project.update({
      where: {
        id,
      },
      data: validatedData,
    })

    return NextResponse.json(project)
  } catch (error: any) {
    console.error('Update project error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '更新项目失败' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/:id - 删除项目
export async function DELETE(
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

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      )
    }

    await prisma.project.delete({
      where: {
        id,
      },
    })

    return NextResponse.json(
      { message: '项目删除成功' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: '删除项目失败' },
      { status: 500 }
    )
  }
}
