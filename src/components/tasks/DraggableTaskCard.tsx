'use client'

import { Task, TaskStatus, Priority } from '@prisma/client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Calendar, GripVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface DraggableTaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onViewComments: (task: Task) => void
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW: { label: '低', color: 'bg-green-500' },
  MEDIUM: { label: '中', color: 'bg-blue-500' },
  HIGH: { label: '高', color: 'bg-orange-500' },
  URGENT: { label: '紧急', color: 'bg-red-500' },
}

export function DraggableTaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onViewComments,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const priority = priorityConfig[task.priority]

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`
          group hover:shadow-xl transition-all duration-200
          bg-white/90 backdrop-blur-sm border border-gray-200
          cursor-grab active:cursor-grabbing
          ${isDragging ? 'shadow-2xl rotate-2 scale-105' : 'shadow-md hover:-translate-y-1'}
        `}
      >
        <CardContent className="p-4">
          {/* 顶部：标题和菜单 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {/* 任务标题 */}
                <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                  {task.title}
                </h3>

                {/* 任务描述 */}
                {task.description && (
                  <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* 操作菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(task)
                  }}
                  className="cursor-pointer"
                >
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewComments(task)
                  }}
                  className="cursor-pointer"
                >
                  查看评论
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(task.id, 'TODO')
                  }}
                  className="cursor-pointer"
                  disabled={task.status === 'TODO'}
                >
                  设为待办
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(task.id, 'IN_PROGRESS')
                  }}
                  className="cursor-pointer"
                  disabled={task.status === 'IN_PROGRESS'}
                >
                  设为进行中
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(task.id, 'DONE')
                  }}
                  className="cursor-pointer"
                  disabled={task.status === 'DONE'}
                >
                  设为已完成
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(task.id)
                  }}
                  className="text-red-600 cursor-pointer focus:text-red-600"
                >
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 底部信息 */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            {/* 优先级徽章 */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${priority.color} animate-pulse`} />
              <span className="text-xs text-gray-600">{priority.label}</span>
            </div>

            {/* 截止日期 */}
            {task.dueDate && (
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                <span>
                  {formatDistanceToNow(new Date(task.dueDate), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
