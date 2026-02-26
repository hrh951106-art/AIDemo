'use client'

import { Task, Priority, TaskStatus } from '@prisma/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Pencil, Trash2, Calendar, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useState, useEffect } from 'react'

interface TaskCardProps {
  task: Task & {
    user?: {
      id: string
      name: string | null
      email: string
    }
    _count?: {
      comments: number
    }
  }
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onViewComments: (task: Task) => void
}

const priorityConfig = {
  LOW: {
    label: '低',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
    dotColor: 'bg-green-500',
  },
  MEDIUM: {
    label: '中',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    dotColor: 'bg-blue-500',
  },
  HIGH: {
    label: '高',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-700 dark:text-orange-400',
    dotColor: 'bg-orange-500',
  },
  URGENT: {
    label: '紧急',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-400',
    dotColor: 'bg-red-500',
  },
}

const statusConfig = {
  TODO: {
    label: '待办',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
  IN_PROGRESS: {
    label: '进行中',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  DONE: {
    label: '已完成',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-400',
  },
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange, onViewComments }: TaskCardProps) {
  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const [commentCount, setCommentCount] = useState(0)

  // 获取评论数量
  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const response = await fetch(`/api/tasks/${task.id}/comments`)
        if (response.ok) {
          const comments = await response.json()
          setCommentCount(comments.length)
        }
      } catch (error) {
        console.error('获取评论数量失败:', error)
      }
    }

    fetchCommentCount()
  }, [task.id])

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
      {/* 状态条 */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${status.bgColor.replace('bg-', 'from-').replace('/20', '')} to-transparent`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            {/* 状态和优先级徽章 */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${status.bgColor} ${status.textColor} border-0 font-medium`}>
                {status.label}
              </Badge>
              <Badge variant="outline" className={`${priority.bgColor} ${priority.textColor} border-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priority.dotColor} mr-1.5 animate-pulse`} />
                {priority.label}优先级
              </Badge>
            </div>

            {/* 任务标题 */}
            <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
              {task.title}
            </h3>

            {/* 任务描述 */}
            {task.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {task.description}
              </p>
            )}
          </div>

          {/* 操作菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(task)} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(task.id, 'TODO')}
                className="cursor-pointer"
                disabled={task.status === 'TODO'}
              >
                设为待办
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(task.id, 'IN_PROGRESS')}
                className="cursor-pointer"
                disabled={task.status === 'IN_PROGRESS'}
              >
                设为进行中
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(task.id, 'DONE')}
                className="cursor-pointer"
                disabled={task.status === 'DONE'}
              >
                设为已完成
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(task.id)}
                className="text-red-600 cursor-pointer focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* 截止日期 */}
        {task.dueDate && (
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1.5" />
            <span>
              {formatDistanceToNow(new Date(task.dueDate), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
        )}

        {/* 评论按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-gray-600 hover:text-blue-600 hover:bg-blue-50/50"
          onClick={() => onViewComments(task)}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          评论 ({commentCount})
        </Button>

        {/* 创建时间 */}
        <div className="text-xs text-gray-400 pt-3 border-t border-gray-100">
          创建于 {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: zhCN })}
        </div>
      </CardContent>
    </Card>
  )
}
