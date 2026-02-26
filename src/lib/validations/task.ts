import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, '任务标题不能为空').max(200, '任务标题不能超过200个字符'),
  description: z.string().max(2000, '任务描述不能超过2000个字符').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  projectId: z.string().min(1, '请选择所属项目').optional(),
  estimatedHours: z.string().optional(),
  assignedUserId: z.string().min(1, '请选择负责人').optional(),
})

export const taskUpdateSchema = z.object({
  id: z.string().cuid('无效的任务ID'),
  title: z.string().min(1, '任务标题不能为空').max(200, '任务标题不能超过200个字符').optional(),
  description: z.string().max(2000, '任务描述不能超过2000个字符').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  startDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  projectId: z.string().nullable().optional(),
  estimatedHours: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
})

export type TaskFormData = z.infer<typeof taskSchema>
export type TaskUpdateData = z.infer<typeof taskUpdateSchema>
