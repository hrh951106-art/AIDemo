'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Clock, Plus, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface TimeEntry {
  id: string
  hours: number
  description: string | null
  date: string
  createdAt: string
}

interface TimeTrackingProps {
  taskId: string
}

export function TimeTracking({ taskId }: TimeTrackingProps) {
  const { data: session } = useSession()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hours, setHours] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchEntries()
  }, [taskId])

  const fetchEntries = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks/${taskId}/time-entries`)
      if (!response.ok) throw new Error('获取工时失败')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('获取工时失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!hours || !parseFloat(hours)) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/tasks/${taskId}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: parseFloat(hours),
          description: description || null,
        }),
      })

      if (!response.ok) throw new Error('记录工时失败')

      setHours('')
      setDescription('')
      setIsDialogOpen(false)
      await fetchEntries()
    } catch (error) {
      console.error('记录工时失败:', error)
      alert('记录工时失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条工时记录吗？')) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/time-entries/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('删除工时失败')

      await fetchEntries()
    } catch (error) {
      console.error('删除工时失败:', error)
      alert('删除工时失败')
    }
  }

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            工时记录
          </h3>
          <span className="text-sm text-gray-500">
            (总计: {totalHours.toFixed(1)} 小时)
          </span>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="mr-1 h-4 w-4" />
              记录工时
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>记录工时</DialogTitle>
              <DialogDescription>
                记录您在此任务上花费的时间
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="hours">工时 (小时)</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="例如: 2.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">说明 (可选)</Label>
                <Input
                  id="description"
                  placeholder="例如: 完成前端开发"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!hours || isSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {isSubmitting ? '提交中...' : '提交'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 工时列表 */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无工时记录，点击上方按钮记录工时
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-600">
                    {entry.hours} 小时
                  </span>
                  {entry.description && (
                    <span className="text-sm text-gray-700">
                      - {entry.description}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(entry.date), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(entry.id)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
