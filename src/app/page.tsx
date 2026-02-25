import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900">
          项目管理系统
        </h1>
        <p className="text-xl text-gray-600">
          简单高效的任务管理和团队协作工具
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link href="/register">
              立即开始
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6">
            <Link href="/login">
              登录
            </Link>
          </Button>
        </div>
        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-3">📋</div>
            <h3 className="font-semibold text-lg mb-2">任务管理</h3>
            <p className="text-sm text-gray-600">
              创建、分配和追踪任务，设置优先级和截止日期
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-2">看板视图</h3>
            <p className="text-sm text-gray-600">
              拖拽式看板，直观展示任务进度和状态
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-3">🚀</div>
            <h3 className="font-semibold text-lg mb-2">高效协作</h3>
            <p className="text-sm text-gray-600">
              团队协作、进度追踪，让项目管理更简单
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
