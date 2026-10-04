export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'To Do' | 'In Progress' | 'Done';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  avatarColor: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedUserId: string;
  dependencyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockingTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface TaskWithDetails extends Task {
  assignee?: User;
  isBlocked: boolean;
  blockingTasks: BlockingTaskSummary[];
  dependencies: BlockingTaskSummary[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedUserId: string;
  dependencyIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedUserId?: string;
  dependencyIds?: string[];
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

export type ViewTab = 'all' | 'my-tasks' | 'blocked';
