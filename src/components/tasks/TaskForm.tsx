'use client'

import { useState, useEffect } from 'react'
import { Task, Priority, TaskStatus } from '@prisma/client'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface User {
  id: string
  name: string | null
  email: string
}

interface Project {
  id: string
  name: string
}

interface TaskFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: TaskFormData) => Promise<void>
  task?: Task | null
  mode: 'create' | 'edit'
  defaultDate?: Date | null
}

export interface TaskFormData {
  title: string
  description: string
  priority: Priority
  status: TaskStatus
  startDate: string
  dueDate: string
  estimatedHours: string
  assignedUserId: string | null
  projectId: string | null
}

export function TaskForm({ open, onClose, onSubmit, task, mode, defaultDate }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    startDate: '',
    dueDate: '',
    estimatedHours: '',
    assignedUserId: null,
    projectId: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true)
        const response = await fetch('/api/users?all=true')
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        }
      } catch (error) {
        console.error('获取用户列表失败:', error)
      } finally {
        setIsLoadingUsers(false)
      }
    }

    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true)
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()
          setProjects(data)
        }
      } catch (error) {
        console.error('获取项目列表失败:', error)
      } finally {
        setIsLoadingProjects(false)
      }
    }

    if (open) {
      fetchUsers()
      fetchProjects()
    }
  }, [open])

  useEffect(() => {
    if (task && mode === 'edit') {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        startDate: (task as any).startDate ? new Date((task as any).startDate).toISOString().split('T')[0] : '',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: (task as any).estimatedHours?.toString() || '',
        assignedUserId: (task as any).assignedUserId || null,
        projectId: (task as any).projectId || null,
      })
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: 'TODO',
        startDate: '',
        dueDate: defaultDate ? defaultDate.toISOString().split('T')[0] : '',
        estimatedHours: '',
        assignedUserId: null,
        projectId: null,
      })
    }
    setError('')
  }, [task, mode, open, defaultDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await onSubmit(formData)
      onClose()
    } catch (err: any) {
      setError(err.message || '操作失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            {mode === 'create' ? '创建新任务' : '编辑任务'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {mode === 'create' ? '填写以下信息创建新任务' : '修改任务信息'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 1. 所属项目 */}
          <div className="space-y-2">
            <Label htmlFor="projectId" className="text-gray-700 font-medium">
              所属项目 <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              value={formData.projectId || ''}
              onChange={(value) => setFormData({ ...formData, projectId: value })}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="选择项目..."
              searchPlaceholder="搜索项目..."
              disabled={isLoading || isLoadingProjects}
              className="border-gray-200"
            />
          </div>

          {/* 2. 任务标题 */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-700 font-medium">
              任务标题 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="输入任务标题..."
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          {/* 3. 任务描述 */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-700 font-medium">
              任务描述
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="详细描述任务内容..."
              rows={4}
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* 4. 优先级 */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-gray-700 font-medium">
              优先级
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value: Priority) => setFormData({ ...formData, priority: value })}
              disabled={isLoading}
            >
              <SelectTrigger className="border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">低优先级</SelectItem>
                <SelectItem value="MEDIUM">中优先级</SelectItem>
                <SelectItem value="HIGH">高优先级</SelectItem>
                <SelectItem value="URGENT">紧急</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 5. 负责人 */}
          <div className="space-y-2">
            <Label htmlFor="assignedUserId" className="text-gray-700 font-medium">
              负责人 <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              value={formData.assignedUserId || ''}
              onChange={(value) => setFormData({ ...formData, assignedUserId: value })}
              options={users.map((u) => ({
                value: u.id,
                label: u.name || u.email,
              }))}
              placeholder="选择负责人..."
              searchPlaceholder="搜索用户..."
              disabled={isLoading || isLoadingUsers}
              className="border-gray-200"
            />
          </div>

          {/* 6. 预计工时 */}
          <div className="space-y-2">
            <Label htmlFor="estimatedHours" className="text-gray-700 font-medium">
              预计工时（小时）
            </Label>
            <Input
              id="estimatedHours"
              type="number"
              step="0.5"
              min="0"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              placeholder="例如: 8"
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          {/* 7. 开始日期 */}
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-gray-700 font-medium">
              开始日期
            </Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* 8. 截止日期 */}
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-gray-700 font-medium">
              截止日期
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* 编辑模式显示状态 */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-700 font-medium">
                状态
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: TaskStatus) => setFormData({ ...formData, status: value })}
                disabled={isLoading}
              >
                <SelectTrigger className="border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">待办</SelectItem>
                  <SelectItem value="IN_PROGRESS">进行中</SelectItem>
                  <SelectItem value="DONE">已完成</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? '保存中...' : mode === 'create' ? '创建任务' : '保存更改'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
