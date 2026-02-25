'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Task, TaskStatus } from '@prisma/client'
import { KanbanColumn } from '@/components/tasks/KanbanColumn'
import { TaskForm, TaskFormData } from '@/components/tasks/TaskForm'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  pointerWithin,
  CollisionDetection,
} from '@dnd-kit/core'

const COLUMNS: { id: TaskStatus; title: string; bgColor: string }[] = [
  { id: 'TODO', title: '待办', bgColor: 'bg-gray-50' },
  { id: 'IN_PROGRESS', title: '进行中', bgColor: 'bg-blue-50' },
  { id: 'DONE', title: '已完成', bgColor: 'bg-green-50' },
]

export default function KanbanPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  // 拖拽状态
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    })
  )

  // 自定义碰撞检测：优先检测列，而不是任务
  const collisionDetection: CollisionDetection = (args) => {
    // 首先检查是否在列上
    const pointerCollisions = pointerWithin(args)

    // 找到所有列的碰撞
    const columnCollisions = pointerCollisions.filter((collision) => {
      return COLUMNS.some((col) => col.id === collision.id)
    })

    // 如果有列碰撞，返回列碰撞
    if (columnCollisions.length > 0) {
      return columnCollisions
    }

    // 否则返回所有碰撞
    return pointerCollisions
  }

  useEffect(() => {
    if (session?.user) {
      fetchTasks()
    }
  }, [session])

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

  const handleCreateTask = async (data: TaskFormData) => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, status: 'TODO' }),
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

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('更新状态失败')

      // 更新本地状态
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )
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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // 查找被悬停的列
    const overColumn = COLUMNS.find((col) => col.id === overId)
    if (overColumn) {
      const task = tasks.find((t) => t.id === activeId)
      if (task && task.status !== overColumn.id) {
        // 立即更新本地状态，让用户看到实时反馈
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
      // 如果没有放置到有效位置，重置任务状态
      await fetchTasks()
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    // 查找目标列
    const targetColumn = COLUMNS.find((col) => col.id === overId)
    if (targetColumn) {
      const task = tasks.find((t) => t.id === activeId)
      if (task && task.status !== targetColumn.id) {
        await handleStatusChange(activeId, targetColumn.id)
      }
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

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">看板视图</h1>
          <p className="text-gray-600 mt-1">拖拽任务卡片来更改状态</p>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          新建任务
        </Button>
      </div>

      {/* 看板 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                bgColor={column.bgColor}
                tasks={getTasksByStatus(column.id)}
                onEdit={openEditForm}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {/* 拖拽覆盖层 */}
          <DragOverlay>
            {activeTask && (
              <div className="rotate-3 opacity-80">
                <div className="bg-white rounded-lg p-4 shadow-2xl border-2 border-blue-500">
                  <p className="font-semibold text-gray-900">{activeTask.title}</p>
                  {activeTask.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {activeTask.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
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
