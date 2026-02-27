'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { MentionableComment } from './MentionableComment'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface TaskCommentsProps {
  taskId: string
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchComments()
  }, [taskId])

  const fetchComments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/tasks/${taskId}/comments`)
      if (!response.ok) throw new Error('获取评论失败')
      const data = await response.json()
      setComments(data)
    } catch (error) {
      console.error('获取评论失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async (content: string, mentionedUserIds: string[]) => {
    const response = await fetch(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, mentionedUserIds }),
    })

    if (!response.ok) throw new Error('发表评论失败')

    await fetchComments()
  }

  const handleDeleteComment = async () => {
    if (!commentToDelete) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments/${commentToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('删除评论失败')

      await fetchComments()
      setDeleteDialogOpen(false)
      setCommentToDelete(null)
    } catch (error) {
      console.error('删除评论失败:', error)
      alert('删除评论失败')
    }
  }

  const confirmDelete = async (commentId: string) => {
    setCommentToDelete(commentId)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">评论 ({comments.length})</h3>

      {/* 评论组件 */}
      <MentionableComment
        taskId={taskId}
        comments={comments}
        isLoading={isLoading}
        onRefresh={fetchComments}
        onSubmit={handleSubmitComment}
        onDelete={confirmDelete}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条评论吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-red-600">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
