'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Task, TaskStatus } from '@prisma/client'
import { DraggableTaskCard } from '@/components/tasks/DraggableTaskCard'
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Kanban } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  pointerWithin,
} from '@dnd-kit/core'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const COLUMNS: { id: TaskStatus; title: string; bgColor: string; borderColor: string }[] = [
  { id: 'TODO', title: '📋 待办', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  { id: 'IN_PROGRESS', title: '🚀 进行中', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'DONE', title: '✅ 已完成', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
]

export const dynamic = 'force-dynamic'

export default function MyTasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<(Task & {
    assignedUser?: {
      id: string
      name: string | null
      email: string
    }
    project?: {
      id: string
      name: string
    }
    user?: {
      id: string
      name: string | null
      email: string
    }
  })[]>([])
  const [filteredTasks, setFilteredTasks] = useState<(Task & {
    assignedUser?: {
      id: string
      name: string | null
      email: string
    }
    project?: {
      id: string
      name: string
    }
    user?: {
      id: string
      name: string | null
      email: string
    }
  })[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 拖拽状态
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    })
  )

  // 自定义碰撞检测
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args)
    const columnCollisions = pointerCollisions.filter((collision) => {
      return COLUMNS.some((col) => col.id === collision.id)
    })

    if (columnCollisions.length > 0) {
      return columnCollisions
    }

    return pointerCollisions
  }

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
      const response = await fetch('/api/my-tasks')
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

    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((task) => task.status === statusFilter)
    }

    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter((task) => task.priority === priorityFilter)
    }

    setFilteredTasks(filtered)
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find((t) => t.id === active.id)
    setActiveId(active.id as string)
    setActiveTask(task || null)
  }

  const handleDragOver = (event: any) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const overColumn = COLUMNS.find((col) => col.id === overId)
    if (overColumn) {
      const task = tasks.find((t) => t.id === activeId)
      if (task && task.status !== overColumn.id) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, status: overColumn.id } : t
          )
        )
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveTask(null)

    if (!over) {
      await fetchTasks()
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const targetColumn = COLUMNS.find((col) => col.id === overId)
    if (targetColumn) {
      const task = tasks.find((t) => t.id === activeId)
      if (task && task.status !== targetColumn.id) {
        await handleStatusChange(activeId, targetColumn.id)
      }
    }
  }

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task)
    setIsDetailDialogOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '🔴 紧急'
      case 'HIGH':
        return '🟠 高'
      case 'MEDIUM':
        return '🟡 中'
      case 'LOW':
        return '🟢 低'
      default:
        return priority
    }
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    urgent: tasks.filter((t) => t.priority === 'URGENT' && t.status !== 'DONE').length,
  }

  const getTasksByStatus = (status: TaskStatus) => {
    return filteredTasks.filter((task) => task.status === status)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Kanban className="h-8 w-8 text-blue-600" />
            我的看板
          </h1>
          <p className="text-gray-600 mt-1">只看分配给我的任务</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">全部任务</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">📋 待办</div>
          <div className="text-3xl font-bold text-gray-700">{stats.todo}</div>
        </div>
        <div className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-blue-200 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">🚀 进行中</div>
          <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
        </div>
        <div className="bg-green-50/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-green-200 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">✅ 已完成</div>
          <div className="text-3xl font-bold text-green-600">{stats.done}</div>
        </div>
        <div className="bg-red-50/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-red-200 hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-1">🔴 紧急</div>
          <div className="text-3xl font-bold text-red-600">{stats.urgent}</div>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索任务..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-200"
            />
          </div>

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

      {/* 看板视图 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无任务</h3>
          <p className="text-gray-500">
            {tasks.length === 0 ? '目前没有任务分配给你' : '尝试调整筛选条件'}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {COLUMNS.map((column) => (
              <div key={column.id} className={`${column.bgColor} ${column.borderColor} border-2 rounded-xl p-4 min-h-[500px]`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
                    {getTasksByStatus(column.id).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {getTasksByStatus(column.id).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => openTaskDetail(task)}
                      className="cursor-pointer"
                    >
                      <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-gray-100">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 text-sm flex-1">{task.title}</h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                            {getPriorityText(task.priority)}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                        )}
                        {task.dueDate && (
                          <div className="text-xs text-gray-500 mb-2">
                            📅 截止：{format(new Date(task.dueDate), 'MM月dd日', { locale: zhCN })}
                          </div>
                        )}
                        {task.project && (
                          <div className="text-xs text-blue-600">
                            📁 {task.project.name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="rotate-3 opacity-80">
                <div className="bg-white rounded-lg p-4 shadow-2xl border-2 border-blue-500 w-72">
                  <p className="font-semibold text-gray-900">{activeTask.title}</p>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* 任务详情对话框 */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={isDetailDialogOpen}
          onClose={() => {
            setIsDetailDialogOpen(false)
            setSelectedTask(null)
          }}
          onEdit={() => {}}
        />
      )}
    </div>
  )
}
