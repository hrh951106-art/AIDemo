'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Send, Trash2 } from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
}

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

interface MentionableCommentProps {
  taskId: string
  comments: Comment[]
  isLoading: boolean
  onRefresh: () => void
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
}

export function MentionableComment({
  taskId,
  comments,
  isLoading,
  onRefresh,
  onSubmit,
  onDelete,
}: MentionableCommentProps) {
  const { data: session } = useSession()
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionUsers, setMentionUsers] = useState<User[]>([])
  const [showMentionPopup, setShowMentionPopup] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionedUsers, setMentionedUsers] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // 搜索用户
  const searchUsers = useCallback(async (query: string) => {
    if (!query) {
      setMentionUsers([])
      return
    }

    try {
      const response = await fetch(`/api/users?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error('搜索用户失败')
      const users = await response.json()
      setMentionUsers(users)
      setShowMentionPopup(true)
      setMentionIndex(0)
    } catch (error) {
      console.error('搜索用户失败:', error)
    }
  }, [])

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewComment(value)

    // 检测 @ 符号
    const cursorPosition = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPosition)

    // 查找最后一个 @ 符号后的文本
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)

      // 检查 @ 后面是否只有文本（没有空格或换行）
      if (/^[\w\u4e00-\u9fa5]*$/.test(textAfterAt) && textAfterAt.length >= 1) {
        setMentionQuery(textAfterAt)
        searchUsers(textAfterAt)
        return
      }
    }

    setShowMentionPopup(false)
    setMentionUsers([])
    setMentionQuery('')
  }

  // 处理用户选择
  const handleSelectUser = (user: User) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = newComment.slice(0, cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    const textAfterCursor = newComment.slice(cursorPosition)

    // 替换 @查询文本 为 @用户名
    const beforeMention = textBeforeCursor.slice(0, lastAtIndex)
    const mentionText = `@${user.name || user.email}`
    const newValue = beforeMention + mentionText + ' ' + textAfterCursor

    setNewComment(newValue)
    setMentionedUsers(new Set([...mentionedUsers, user.id]))
    setShowMentionPopup(false)
    setMentionUsers([])

    // 设置光标位置
    setTimeout(() => {
      const newPosition = (beforeMention + mentionText + ' ').length
      textareaRef.current?.setSelectionRange(newPosition, newPosition)
      textareaRef.current?.focus()
    }, 0)
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionPopup || mentionUsers.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionIndex((prev) => (prev + 1) % mentionUsers.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selectedUser = mentionUsers[mentionIndex]
      if (selectedUser) {
        handleSelectUser(selectedUser)
      }
    } else if (e.key === 'Escape') {
      setShowMentionPopup(false)
      setMentionUsers([])
    }
  }

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    // 提取所有被提及的用户
    const mentions = newComment.match(/@[\w\u4e00-\u9fa5]+/g) || []
    const mentionedUserIds = mentionedUsers

    setIsSubmitting(true)
    try {
      await onSubmit(newComment, Array.from(mentionedUserIds))
      setNewComment('')
      setMentionedUsers(new Set())
    } finally {
      setIsSubmitting(false)
    }
  }

  // 高亮评论中的提及
  const highlightMentions = (content: string) => {
    return content.replace(/@([\w\u4e00-\u9fa5]+)/g, '<span class="text-blue-600 font-medium">@$1</span>')
  }

  return (
    <div className="relative">
      {/* 评论输入 */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs">
              {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2 relative">
            <Textarea
              ref={textareaRef}
              placeholder="写下你的评论... 使用 @ 提及成员"
              value={newComment}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="min-h-[80px] resize-none"
              disabled={isSubmitting}
            />

            {/* 用户建议弹出框 */}
            {showMentionPopup && mentionUsers.length > 0 && (
              <div
                ref={popupRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-10"
              >
                {mentionUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                      index === mentionIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectUser(user)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || '未知用户'}
                      </div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {isSubmitting ? (
              '发送中...'
            ) : (
              <>
                <Send className="mr-1 h-4 w-4" />
                发送
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="space-y-4 mt-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            暂无评论，来发表第一条评论吧
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs">
                  {comment.user.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">
                    {comment.user.name || '未知用户'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                </div>
                <p
                  className="text-sm text-gray-700 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: highlightMentions(comment.content) }}
                />
              </div>

              {/* 删除按钮 */}
              {session?.user?.id === comment.user.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDelete(comment.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
