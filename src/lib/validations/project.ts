import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空').max(100, '项目名称不能超过100个字符'),
  description: z.string().max(500, '项目描述不能超过500个字符').optional(),
  plannedHours: z.number().min(0, '计划工时必须大于等于0').optional(),
})

export const timeEntrySchema = z.object({
  hours: z.number().min(0.1, '工时至少0.1小时').max(24, '单次工时不能超过24小时'),
  description: z.string().max(200, '说明不能超过200个字符').optional(),
  date: z.string().or(z.date()),
  taskId: z.string().cuid('无效的任务ID'),
  projectId: z.string().cuid('无效的项目ID'),
})

export const commentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(1000, '评论内容不能超过1000个字符'),
  taskId: z.string().cuid('无效的任务ID'),
  mentions: z.array(z.string().cuid()).optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>
export type TimeEntryFormData = z.infer<typeof timeEntrySchema>
export type CommentFormData = z.infer<typeof commentSchema>
