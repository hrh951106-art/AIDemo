'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Task, Priority, TaskStatus } from '@prisma/client'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')

  useEffect(() => {
    if (session?.user) {
      fetchTasks()
    }
  }, [session])

  useEffect(() => {
    filterTasks()
  }, [tasks, searchQuery, statusFilter, priorityFilter])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('获取任务失败')
      const data = await response.json()
      setTasks(data)
    } catch (error) {
      console.error('获取任务失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterTasks = () => {
    let filtered = [...tasks]

    // 搜索过滤
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // 状态过滤
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    // 优先级过滤
    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter((task) => task.priority === priorityFilter)
    }

    setFilteredTasks(filtered)
  }

  const handleCreateTask = async (data: TaskFormData) => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '创建任务失败')
    }

    await fetchTasks()
  }

  const handleUpdateTask = async (data: TaskFormData) => {
    if (!editingTask) return

    const response = await fetch(`/api/tasks/${editingTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: editingTask.id }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '更新任务失败')
    }

    await fetchTasks()
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm('确定要删除这个任务吗？')) return

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('删除任务失败')

      await fetchTasks()
    } catch (error) {
      console.error('删除任务失败:', error)
      alert('删除任务失败')
    }
  }

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) throw new Error('更新状态失败')

      await fetchTasks()
    } catch (error) {
      console.error('更新状态失败:', error)
      alert('更新状态失败')
    }
  }

  const openCreateForm = () => {
    setEditingTask(null)
    setFormMode('create')
    setIsFormOpen(true)
  }

  const openEditForm = (task: Task) => {
    setEditingTask(task)
    setFormMode('edit')
    setIsFormOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">我的任务</h1>
          <p className="text-gray-600 mt-1">管理和追踪您的所有任务</p>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          新建任务
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">全部任务</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">待办</div>
          <div className="text-3xl font-bold text-gray-700">{stats.todo}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">进行中</div>
          <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">已完成</div>
          <div className="text-3xl font-bold text-green-600">{stats.done}</div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Filter className="h-4 w-4" />
          <span className="font-medium">筛选和搜索</span>
          {(searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
              清除筛选
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索任务..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200"
            />
          </div>

          {/* 状态筛选 */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-gray-200">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部状态</SelectItem>
              <SelectItem value="TODO">待办</SelectItem>
              <SelectItem value="IN_PROGRESS">进行中</SelectItem>
              <SelectItem value="DONE">已完成</SelectItem>
            </SelectContent>
          </Select>

          {/* 优先级筛选 */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="border-gray-200">
              <SelectValue placeholder="优先级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部优先级</SelectItem>
              <SelectItem value="LOW">低</SelectItem>
              <SelectItem value="MEDIUM">中</SelectItem>
              <SelectItem value="HIGH">高</SelectItem>
              <SelectItem value="URGENT">紧急</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 任务列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无任务</h3>
          <p className="text-gray-500 mb-6">
            {tasks.length === 0 ? '点击"新建任务"开始创建您的第一个任务' : '尝试调整筛选条件'}
          </p>
          {tasks.length === 0 && (
            <Button onClick={openCreateForm} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="mr-2 h-4 w-4" />
              新建任务
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={openEditForm}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* 任务表单对话框 */}
      <TaskForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={formMode === 'create' ? handleCreateTask : handleUpdateTask}
        task={editingTask}
        mode={formMode}
      />
    </div>
  )
}
