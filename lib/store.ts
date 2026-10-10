import {
  User,
  Task,
  TaskWithDetails,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  UpdateTaskInput,
  CreateUserInput,
  BlockingTaskSummary,
} from './types';

// Initial Seed Users
export const SEED_USERS: User[] = [
  {
    id: 'USR-1',
    name: 'Alex Rivera',
    email: 'alex@company.internal',
    role: 'Principal Systems Architect',
    initials: 'AR',
    avatarColor: '#18181B',
  },
  {
    id: 'USR-2',
    name: 'Sarah Chen',
    email: 'sarah@company.internal',
    role: 'Staff Frontend Engineer',
    initials: 'SC',
    avatarColor: '#27272A',
  },
  {
    id: 'USR-3',
    name: 'Marcus Vance',
    email: 'marcus@company.internal',
    role: 'Infrastructure & Data Lead',
    initials: 'MV',
    avatarColor: '#3F3F46',
  },
  {
    id: 'USR-4',
    name: 'Elena Rostova',
    email: 'elena@company.internal',
    role: 'Principal Product Designer',
    initials: 'ER',
    avatarColor: '#52525B',
  },
];

// Initial Seed Tasks with intentional dependency relationships
export const SEED_TASKS: Task[] = [
  {
    id: 'TSK-101',
    title: 'Audit design tokens and color contrast for WCAG 2.1 AA',
    description: 'Verify neutral ink scale, focus ring visibility, and tap targets across light and dark views.',
    priority: 'Medium',
    status: 'Done',
    assignedUserId: 'USR-4',
    dependencyIds: [],
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-30T14:15:00.000Z',
  },
  {
    id: 'TSK-102',
    title: 'Implement Stripe customer portal checkout session API',
    description: 'Create server-side session handlers with webhook signatures and customer metadata verification.',
    priority: 'High',
    status: 'Done',
    assignedUserId: 'USR-1',
    dependencyIds: [],
    createdAt: '2026-09-29T10:30:00.000Z',
    updatedAt: '2026-10-01T11:45:00.000Z',
  },
  {
    id: 'TSK-103',
    title: 'Design onboarding step-by-step user welcome flow',
    description: 'Create interactive Figma wireframes and mobile views for workspace setup and team invitations.',
    priority: 'Medium',
    status: 'Done',
    assignedUserId: 'USR-4',
    dependencyIds: [],
    createdAt: '2026-09-30T11:00:00.000Z',
    updatedAt: '2026-10-01T16:00:00.000Z',
  },
  {
    id: 'TSK-104',
    title: 'Setup team invite link generation and email dispatch',
    description: 'Enable workspace members to invite teammates via secure expirable token links.',
    priority: 'High',
    status: 'In Progress',
    assignedUserId: 'USR-2',
    dependencyIds: ['TSK-103'],
    createdAt: '2026-10-01T08:15:00.000Z',
    updatedAt: '2026-10-02T10:30:00.000Z',
  },
  {
    id: 'TSK-105',
    title: 'Build workspace billing and subscription settings page',
    description: 'Display active tier, monthly usage metrics, invoice history, and direct link to Stripe portal.',
    priority: 'High',
    status: 'To Do',
    assignedUserId: 'USR-2',
    dependencyIds: ['TSK-102'],
    createdAt: '2026-10-01T11:00:00.000Z',
    updatedAt: '2026-10-01T11:00:00.000Z',
  },
  {
    id: 'TSK-106',
    title: 'Integrate Google and GitHub OAuth single sign-on',
    description: 'Configure OAuth 2.0 PKCE authentication callback endpoints and session profile caching.',
    priority: 'High',
    status: 'In Progress',
    assignedUserId: 'USR-3',
    dependencyIds: [],
    createdAt: '2026-10-02T09:40:00.000Z',
    updatedAt: '2026-10-02T15:10:00.000Z',
  },
  {
    id: 'TSK-107',
    title: 'Automated Slack notification dispatch on task assignments',
    description: 'Send direct Slack webhook notifications when a teammate is assigned to a high-priority task.',
    priority: 'Low',
    status: 'To Do',
    assignedUserId: 'USR-3',
    dependencyIds: ['TSK-106'],
    createdAt: '2026-10-02T13:00:00.000Z',
    updatedAt: '2026-10-02T13:00:00.000Z',
  },
  {
    id: 'TSK-108',
    title: 'Customer invoice PDF export and receipt download',
    description: 'Generate downloadable PDF receipts for historical charges using billing webhook receipts.',
    priority: 'Medium',
    status: 'To Do',
    assignedUserId: 'USR-1',
    dependencyIds: ['TSK-105'],
    createdAt: '2026-10-02T14:30:00.000Z',
    updatedAt: '2026-10-02T14:30:00.000Z',
  },
  {
    id: 'TSK-109',
    title: 'Mobile navigation drawer and tactile swipe polish',
    description: 'Ensure touch targets exceed 44px, bottom sheet interactions are smooth, and keyboard traps work.',
    priority: 'Low',
    status: 'To Do',
    assignedUserId: 'USR-4',
    dependencyIds: [],
    createdAt: '2026-10-03T09:00:00.000Z',
    updatedAt: '2026-10-03T09:00:00.000Z',
  },
];

/**
 * Thread-safe & HMR-safe in-memory database simulation using JavaScript Map & Set collections.
 */
class InMemoryDatabase {
  private users: Map<string, User>;
  private tasks: Map<string, Task>;
  private nextTaskIdNumber: number;

  constructor() {
    this.users = new Map<string, User>();
    this.tasks = new Map<string, Task>();
    this.nextTaskIdNumber = 110;
    this.seed();
  }

  public seed(): void {
    this.users.clear();
    for (const u of SEED_USERS) {
      this.users.set(u.id, { ...u });
    }

    this.tasks.clear();
    for (const t of SEED_TASKS) {
      this.tasks.set(t.id, { ...t, dependencyIds: [...t.dependencyIds] });
    }
  }

  // ---------------------------------------------------------------------------
  // USERS
  // ---------------------------------------------------------------------------

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public createUser(input: CreateUserInput): User {
    const id = `USR-${this.users.size + 1}`;
    const initials = input.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

    const colors = ['#18181B', '#27272A', '#3F3F46', '#52525B', '#71717A'];
    const avatarColor = colors[this.users.size % colors.length];

    const newUser: User = {
      id,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      role: input.role.trim() || 'Team Member',
      initials,
      avatarColor,
    };

    this.users.set(newUser.id, newUser);
    return newUser;
  }

  // ---------------------------------------------------------------------------
  // TASKS & DEPENDENCY GRAPH RESOLUTION
  // ---------------------------------------------------------------------------

  /**
   * Evaluates the blocked status of a task by checking its dependencies.
   * A task is blocked if it is not already 'Done' and ANY dependency does not have status === 'Done'.
   */
  private enrichTaskWithDetails(task: Task): TaskWithDetails {
    const assignee = this.users.get(task.assignedUserId);
    const blockingTasks: BlockingTaskSummary[] = [];
    const dependencies: BlockingTaskSummary[] = [];

    for (const depId of task.dependencyIds) {
      const depTask = this.tasks.get(depId);
      if (depTask) {
        const summary: BlockingTaskSummary = {
          id: depTask.id,
          title: depTask.title,
          status: depTask.status,
        };
        dependencies.push(summary);

        // If prerequisite is not 'Done', it actively blocks this task
        if (depTask.status !== 'Done') {
          blockingTasks.push(summary);
        }
      }
    }

    return {
      ...task,
      assignee,
      isBlocked: task.status !== 'Done' && blockingTasks.length > 0,
      blockingTasks,
      dependencies,
    };
  }

  public getAllTasks(filter?: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedUserId?: string;
    search?: string;
    blockedOnly?: boolean;
  }): TaskWithDetails[] {
    let result = Array.from(this.tasks.values()).map((t) => this.enrichTaskWithDetails(t));

    if (filter) {
      if (filter.status) {
        result = result.filter((t) => t.status === filter.status);
      }
      if (filter.priority) {
        result = result.filter((t) => t.priority === filter.priority);
      }
      if (filter.assignedUserId) {
        result = result.filter((t) => t.assignedUserId === filter.assignedUserId);
      }
      if (filter.blockedOnly) {
        result = result.filter((t) => t.isBlocked);
      }
      if (filter.search && filter.search.trim()) {
        const q = filter.search.toLowerCase().trim();
        result = result.filter(
          (t) =>
            t.id.toLowerCase().includes(q) ||
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.assignee?.name.toLowerCase().includes(q)
        );
      }
    }

    // Sort by creation desc
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getTaskById(id: string): TaskWithDetails | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    return this.enrichTaskWithDetails(task);
  }

  public createTask(input: CreateTaskInput): { success: boolean; task?: TaskWithDetails; error?: string } {
    if (!input.title || !input.title.trim()) {
      return { success: false, error: 'Task title is required.' };
    }

    if (!input.assignedUserId || !this.users.has(input.assignedUserId)) {
      return { success: false, error: 'Valid assigned team member is required.' };
    }

    const rawDeps = input.dependencyIds || [];

    // Validate that all referenced dependencies exist
    for (const depId of rawDeps) {
      if (!this.tasks.has(depId)) {
        return { success: false, error: `Prerequisite task ${depId} does not exist.` };
      }
    }

    const cleanedDeps = Array.from(new Set(rawDeps));
    const targetStatus = input.status || 'To Do';

    // Strict Transition Invariant: cannot set status 'Done' if any prerequisite is unfinished
    if (targetStatus === 'Done') {
      const pendingBlockers: string[] = [];
      for (const depId of cleanedDeps) {
        const dep = this.tasks.get(depId);
        if (dep && dep.status !== 'Done') {
          pendingBlockers.push(`${dep.id} ("${dep.title}")`);
        }
      }
      if (pendingBlockers.length > 0) {
        return {
          success: false,
          error: `Cannot create task as Done: blocked by pending prerequisite(s): ${pendingBlockers.join(', ')}. All prerequisites must be completed first.`,
        };
      }
    }

    const id = `TSK-${this.nextTaskIdNumber++}`;
    const now = new Date().toISOString();

    const newTask: Task = {
      id,
      title: input.title.trim(),
      description: (input.description || '').trim(),
      priority: input.priority || 'Medium',
      status: targetStatus,
      assignedUserId: input.assignedUserId,
      dependencyIds: cleanedDeps,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, newTask);
    return { success: true, task: this.enrichTaskWithDetails(newTask) };
  }

  /**
   * Updates a task with strict dependency completion guardrails and circular reference checks.
   */
  public updateTask(
    id: string,
    input: UpdateTaskInput
  ): { success: boolean; task?: TaskWithDetails; error?: string } {
    const existing = this.tasks.get(id);
    if (!existing) {
      return { success: false, error: `Task ${id} was not found.` };
    }

    // Determine target dependency IDs
    let nextDependencyIds = existing.dependencyIds;
    if (input.dependencyIds !== undefined) {
      // Forbid self-dependency explicitly
      if (input.dependencyIds.includes(id)) {
        return {
          success: false,
          error: `Cannot set task ${id} as a dependency of itself.`,
        };
      }

      // Check existence of all referenced dependencies
      for (const depId of input.dependencyIds) {
        if (!this.tasks.has(depId)) {
          return {
            success: false,
            error: `Prerequisite task ${depId} does not exist.`,
          };
        }
      }

      const cleaned = Array.from(
        new Set(input.dependencyIds.filter((depId) => depId !== id))
      );

      // Check circular dependency: this task cannot be in any prerequisite's dependency chain
      if (this.detectCycle(id, cleaned)) {
        return {
          success: false,
          error: `Cannot update dependencies for ${id}: circular dependency detected. A task cannot depend on another task that directly or indirectly depends on it.`,
        };
      }
      nextDependencyIds = cleaned;
    }

    // Target status
    const targetStatus = input.status !== undefined ? input.status : existing.status;

    // STRICT TRANSITION INVARIANT: If status is 'Done', verify no pending prerequisites
    if (targetStatus === 'Done') {
      const pendingBlockers: string[] = [];
      for (const depId of nextDependencyIds) {
        const dep = this.tasks.get(depId);
        if (dep && dep.status !== 'Done') {
          pendingBlockers.push(`${dep.id} ("${dep.title}")`);
        }
      }

      if (pendingBlockers.length > 0) {
        return {
          success: false,
          error: `Cannot mark task as Done: blocked by ${pendingBlockers.length} pending prerequisite${
            pendingBlockers.length === 1 ? '' : 's'
          }: ${pendingBlockers.join(', ')}. All prerequisites must be completed first.`,
        };
      }
    }

    // Validate assignee if provided
    let assignedUserId = existing.assignedUserId;
    if (input.assignedUserId !== undefined) {
      if (!this.users.has(input.assignedUserId)) {
        return {
          success: false,
          error: `Assignee user ${input.assignedUserId} does not exist.`,
        };
      }
      assignedUserId = input.assignedUserId;
    }

    const updated: Task = {
      ...existing,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description: input.description !== undefined ? input.description.trim() : existing.description,
      priority: input.priority !== undefined ? input.priority : existing.priority,
      status: targetStatus,
      assignedUserId,
      dependencyIds: nextDependencyIds,
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(id, updated);
    return { success: true, task: this.enrichTaskWithDetails(updated) };
  }

  /**
   * 3-Color DFS Cycle Detection (White/Gray/Black).
   * Validates if assigning proposedDependencies to taskId creates any cycle.
   */
  private detectCycle(taskId: string, proposedDependencies: string[]): boolean {
    if (!proposedDependencies || proposedDependencies.length === 0) return false;
    if (proposedDependencies.includes(taskId)) return true;

    const graph = new Map<string, string[]>();
    for (const [id, t] of this.tasks.entries()) {
      if (id === taskId) {
        graph.set(id, proposedDependencies);
      } else {
        graph.set(id, t.dependencyIds || []);
      }
    }
    if (!graph.has(taskId)) {
      graph.set(taskId, proposedDependencies);
    }

    const state = new Map<string, number>();

    const hasCycleDfs = (node: string): boolean => {
      const nodeState = state.get(node) || 0;
      if (nodeState === 1) return true;
      if (nodeState === 2) return false;

      state.set(node, 1);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycleDfs(neighbor)) return true;
      }

      state.set(node, 2);
      return false;
    };

    if (hasCycleDfs(taskId)) return true;

    for (const node of graph.keys()) {
      if ((state.get(node) || 0) === 0) {
        if (hasCycleDfs(node)) return true;
      }
    }

    return false;
  }

  /**
   * CASCADE CLEANUP:
   * Deletes task and purges its ID from all other tasks' dependency lists.
   */
  public deleteTask(id: string): boolean {
    if (!this.tasks.has(id)) {
      return false;
    }

    // Delete task itself
    this.tasks.delete(id);

    // Clean cascade: remove deleted ID from any other task's dependencyIds
    this.tasks.forEach((task, taskId) => {
      if (task.dependencyIds.includes(id)) {
        task.dependencyIds = task.dependencyIds.filter((depId: string) => depId !== id);
        task.updatedAt = new Date().toISOString();
        this.tasks.set(taskId, task);
      }
    });

    return true;
  }
}

// Global singleton declaration for HMR preservation in development
declare global {
  // eslint-disable-next-line no-var
  var __smartTaskManagerStoreV3: InMemoryDatabase | undefined;
}

export const store = globalThis.__smartTaskManagerStoreV3 ?? new InMemoryDatabase();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__smartTaskManagerStoreV3 = store;
}
