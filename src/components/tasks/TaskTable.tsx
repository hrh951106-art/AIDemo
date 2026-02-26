'use client'

import { Task, TaskStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MoreHorizontal, Pencil, Trash2, MessageCircle, Calendar, Clock, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useState, useEffect } from 'react'

interface TaskTableProps {
  tasks: (Task & {
    assignedUser?: {
      id: string
      name: string | null
      email: string
    }
    project?: {
      id: string
      name: string
    }
    _count?: {
      comments: number
    }
  })[]
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
  },
  MEDIUM: {
    label: '中',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  HIGH: {
    label: '高',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-700 dark:text-orange-400',
  },
  URGENT: {
    label: '紧急',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-400',
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

export function TaskTable({ tasks, onEdit, onDelete, onStatusChange, onViewComments }: TaskTableProps) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const fetchCommentCounts = async () => {
      const counts: Record<string, number> = {}
      await Promise.all(
        tasks.map(async (task) => {
          try {
            const response = await fetch(`/api/tasks/${task.id}/comments`)
            if (response.ok) {
              const comments = await response.json()
              counts[task.id] = comments.length
            }
          } catch (error) {
            console.error('获取评论数量失败:', error)
            counts[task.id] = 0
          }
        })
      )
      setCommentCounts(counts)
    }

    if (tasks.length > 0) {
      fetchCommentCounts()
    }
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">暂无任务</h3>
        <p className="text-gray-500">调整筛选条件或创建新任务</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-0 shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
            <TableHead className="font-semibold text-gray-700">任务标题</TableHead>
            <TableHead className="font-semibold text-gray-700">状态</TableHead>
            <TableHead className="font-semibold text-gray-700">优先级</TableHead>
            <TableHead className="font-semibold text-gray-700">分配给</TableHead>
            <TableHead className="font-semibold text-gray-700">项目</TableHead>
            <TableHead className="font-semibold text-gray-700">预计工时</TableHead>
            <TableHead className="font-semibold text-gray-700">截止日期</TableHead>
            <TableHead className="font-semibold text-gray-700">评论</TableHead>
            <TableHead className="font-semibold text-gray-700 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const priority = priorityConfig[task.priority]
            const status = statusConfig[task.status]

            return (
              <TableRow
                key={task.id}
                className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                onClick={() => onViewComments(task)}
              >
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-xs text-gray-500 line-clamp-1">{task.description}</div>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge className={`${status.bgColor} ${status.textColor} border-0`}>
                    {status.label}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={`${priority.bgColor} ${priority.textColor} border-0`}>
                    {priority.label}
                  </Badge>
                </TableCell>

                <TableCell>
                  {task.assignedUser ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                        {(task.assignedUser.name || task.assignedUser.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-700">
                        {task.assignedUser.name || task.assignedUser.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">未分配</span>
                  )}
                </TableCell>

                <TableCell>
                  {task.project ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      {task.project.name}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">无项目</span>
                  )}
                </TableCell>

                <TableCell>
                  {task.estimatedHours ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {task.estimatedHours}h
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>

                <TableCell>
                  {task.dueDate ? (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {formatDistanceToNow(new Date(task.dueDate), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>

                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-gray-600 hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewComments(task)
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    {commentCounts[task.id] || 0}
                  </Button>
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-gray-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
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
                        <Pencil className="mr-2 h-4 w-4" />
                        编辑
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
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
