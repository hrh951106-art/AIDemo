'use client'

import { Task, TaskStatus } from '@prisma/client'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DraggableTaskCard } from '@/components/tasks/DraggableTaskCard'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

interface KanbanColumnProps {
  id: TaskStatus
  title: string
  bgColor: string
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onViewComments: (task: Task) => void
}

const statusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  TODO: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
  },
  IN_PROGRESS: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  DONE: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
}

export function KanbanColumn({
  id,
  title,
  bgColor,
  tasks,
  onEdit,
  onDelete,
  onStatusChange,
  onViewComments,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  const colors = statusColors[id]

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-2xl p-4 min-h-[600px] transition-all duration-300
        ${isOver ? 'ring-4 ring-blue-400 ring-opacity-50 scale-105 shadow-xl' : 'shadow-md'}
        ${bgColor}
      `}
    >
      {/* 列标题 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <Badge variant="secondary" className="font-semibold">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* 任务列表 */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onViewComments={onViewComments}
            />
          ))}
        </div>
      </SortableContext>

      {/* 空状态 */}
      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl bg-white/50">
          <p className="text-gray-500 text-sm">暂无任务</p>
          <p className="text-gray-400 text-xs mt-1">拖拽任务到此处</p>
        </div>
      )}
    </div>
  )
}
