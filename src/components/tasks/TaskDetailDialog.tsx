'use client'

import { useState } from 'react'
import { Task, Priority, TaskStatus } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TaskComments } from './TaskComments'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { X, Calendar, Flag } from 'lucide-react'

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onEdit: (task: Task) => void
}

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  LOW: { label: '低', color: 'bg-gray-100 text-gray-700' },
  MEDIUM: { label: '中', color: 'bg-blue-100 text-blue-700' },
  HIGH: { label: '高', color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: '紧急', color: 'bg-red-100 text-red-700' },
}

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  TODO: { label: '待办', color: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  DONE: { label: '已完成', color: 'bg-green-100 text-green-700' },
}

export function TaskDetailDialog({ task, open, onClose, onEdit }: TaskDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details')

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">{task.title}</DialogTitle>
              <DialogDescription className="mt-2">
                创建于 {format(new Date(task.createdAt), 'PPP', { locale: zhCN })}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* 标签页切换 */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            详情
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'comments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            评论
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <div className="space-y-6 py-4">
              {/* 描述 */}
              {task.description ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">描述</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  暂无描述
                </div>
              )}

              {/* 属性 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">优先级：</span>
                  <Badge className={priorityConfig[task.priority].color}>
                    {priorityConfig[task.priority].label}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">状态：</span>
                  <Badge className={statusConfig[task.status].color}>
                    {statusConfig[task.status].label}
                  </Badge>
                </div>

                {task.dueDate && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">截止日期：</span>
                    <span className="text-sm text-gray-900">
                      {format(new Date(task.dueDate), 'PPP', { locale: zhCN })}
                    </span>
                  </div>
                )}
              </div>

              {/* 编辑按钮 */}
              <div className="flex justify-end pt-4">
                <Button onClick={() => onEdit(task)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  编辑任务
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <TaskComments taskId={task.id} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
