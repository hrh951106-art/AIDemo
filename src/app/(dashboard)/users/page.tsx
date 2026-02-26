'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Mail, User as UserIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface User {
  id: string
  name: string | null
  email: string
  password: string
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/users?all=true')
      console.log('fetchUsers response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('错误响应:', errorData)
        throw new Error(errorData.error || '获取用户列表失败')
      }

      const data = await response.json()
      console.log('fetchUsers data:', data)
      console.log('fetchUsers data length:', data.length)
      setUsers(data)
    } catch (error) {
      console.error('获取用户列表失败:', error)
      alert(`获取用户列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateForm = () => {
    setEditingUser(null)
    setFormMode('create')
    setFormData({ name: '', email: '', password: '' })
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditForm = (user: User) => {
    setEditingUser(user)
    setFormMode('edit')
    setFormData({ name: user.name || '', email: user.email, password: '' })
    setFormError('')
    setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      const url = formMode === 'create'
        ? '/api/users'
        : `/api/users/${editingUser!.id}`

      const method = formMode === 'create' ? 'POST' : 'PUT'

      console.log('提交用户数据:', { formMode, url, method, formData })

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      console.log('响应状态:', response.status)

      if (!response.ok) {
        const error = await response.json()
        console.error('错误响应:', error)
        throw new Error(error.error || '操作失败')
      }

      const result = await response.json()
      console.log('操作成功，返回数据:', result)

      await fetchUsers()
      setIsFormOpen(false)
    } catch (error: any) {
      console.error('操作失败:', error)
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = (user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除失败')
      }

      await fetchUsers()
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } catch (error: any) {
      alert(error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-600 mt-1">管理系统用户和权限</p>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="mr-2 h-4 w-4" />
          新增用户
        </Button>
      </div>

      {/* 用户列表 */}
      <div className="rounded-xl border-0 shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                <TableHead className="font-semibold text-gray-700">用户</TableHead>
                <TableHead className="font-semibold text-gray-700">邮箱</TableHead>
                <TableHead className="font-semibold text-gray-700">密码</TableHead>
                <TableHead className="font-semibold text-gray-700">注册时间</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-blue-50/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">
                        {user.name || '未设置姓名'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-500 font-mono text-sm tracking-wider">
                      {'•'.repeat(8)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(user.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(user)}
                        className="h-8 w-8 p-0 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(user)}
                        className="h-8 w-8 p-0 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 新增/编辑用户对话框 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {formMode === 'create' ? '新增用户' : '编辑用户'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {formMode === 'create' ? '填写以下信息创建新用户' : '修改用户信息'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">
                姓名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入用户姓名..."
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                邮箱 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                密码 {formMode === 'create' && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={formMode === 'create' ? '输入密码（至少6个字符）' : '留空则不修改密码'}
                className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                disabled={isSubmitting}
                minLength={6}
                required={formMode === 'create'}
              />
            </div>

            <DialogFooter className="gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isSubmitting ? '保存中...' : formMode === 'create' ? '创建用户' : '保存更改'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除用户 <span className="font-semibold text-gray-900">
                {userToDelete?.name || userToDelete?.email}
              </span> 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setUserToDelete(null)
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
