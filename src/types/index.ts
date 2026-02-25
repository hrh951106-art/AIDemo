import { Task, Priority, TaskStatus } from '@prisma/client'

export type { Task, Priority, TaskStatus }

// 新增类型导出
export { Project, Comment, Mention, TimeEntry, Notification } from '@prisma/client'

export type TaskWithRelations = Task & {
  user?: {
    id: string
    name: string | null
    email: string
  }
  project?: Project
  comments?: Comment[]
  timeEntries?: TimeEntry[]
}

export interface TaskInput {
  title: string
  description?: string
  priority?: Priority
  status?: TaskStatus
  dueDate?: Date | string
  projectId?: string
}

export interface TaskUpdate extends TaskInput {
  id: string
}

export interface ProjectInput {
  name: string
  description?: string
  plannedHours?: number
}

export interface ProjectUpdate extends ProjectInput {
  id: string
  status?: string
}

export interface CommentInput {
  content: string
  taskId: string
  mentions?: string[] // 被提及的用户ID列表
}

export interface TimeEntryInput {
  hours: number
  description?: string
  date: Date | string
  taskId: string
  projectId: string
}
