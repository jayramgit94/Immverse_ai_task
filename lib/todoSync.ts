import { Task, TaskWithDetails, User, BlockingTaskSummary, TaskPriority, TaskStatus } from './types';

/**
 * Normalizes raw task items (handling full tasks or minimal to-dos)
 * and resolves assignee details and blocker dependency states.
 */
export function enrichTasks(rawTasks: any[], userList: User[]): TaskWithDetails[] {
  if (!Array.isArray(rawTasks)) return [];

  const userMap = new Map(userList.map((u) => [u.id, u]));

  // Normalize base task structures
  const normalizedTasks: Task[] = rawTasks.map((t, index) => {
    const id = t.id ? String(t.id) : `TSK-${100 + index}`;
    const title = (t.title || t.text || 'Untitled Task').trim();
    const description = (t.description || '').trim();
    const priority: TaskPriority = ['Low', 'Medium', 'High'].includes(t.priority)
      ? (t.priority as TaskPriority)
      : 'Medium';

    let status: TaskStatus = 'To Do';
    if (['To Do', 'In Progress', 'Done'].includes(t.status)) {
      status = t.status as TaskStatus;
    } else if (t.completed === true) {
      status = 'Done';
    } else if (t.completed === false) {
      status = 'To Do';
    }

    const assignedUserId = t.assignedUserId || (userList[0]?.id ?? 'USR-1');
    const dependencyIds: string[] = Array.isArray(t.dependencyIds)
      ? t.dependencyIds.map(String)
      : [];
    const createdAt = t.createdAt || new Date().toISOString();
    const updatedAt = t.updatedAt || new Date().toISOString();

    return {
      id,
      title,
      description,
      priority,
      status,
      assignedUserId,
      dependencyIds,
      createdAt,
      updatedAt,
    };
  });

  const taskMap = new Map(normalizedTasks.map((t) => [t.id, t]));

  return normalizedTasks.map((task) => {
    const assignee = userMap.get(task.assignedUserId) || {
      id: task.assignedUserId,
      name: 'Unassigned',
      email: '',
      role: 'Team Member',
      initials: '?',
      avatarColor: '#52525B',
    };

    const blockingTasks: BlockingTaskSummary[] = [];
    const dependencies: BlockingTaskSummary[] = [];

    for (const depId of task.dependencyIds) {
      const depTask = taskMap.get(depId);
      if (depTask) {
        const summary: BlockingTaskSummary = {
          id: depTask.id,
          title: depTask.title,
          status: depTask.status,
        };
        dependencies.push(summary);

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
  });
}

/**
 * Industry-standard 3-color (White/Gray/Black) cycle detection in a Directed Graph.
 * Validates whether assigning proposedDependencies to taskId would create ANY circular dependency.
 * Guarantees O(V + E) runtime and eliminates recursion loops.
 */
export function detectCycle(taskId: string, proposedDependencies: string[], allTasks: Task[]): boolean {
  if (!proposedDependencies || proposedDependencies.length === 0) return false;
  if (proposedDependencies.includes(taskId)) return true;

  // Build simulated adjacency list
  const graph = new Map<string, string[]>();
  for (const t of allTasks) {
    if (t.id === taskId) {
      graph.set(t.id, proposedDependencies);
    } else {
      graph.set(t.id, t.dependencyIds || []);
    }
  }
  if (!graph.has(taskId)) {
    graph.set(taskId, proposedDependencies);
  }

  // 0: Unvisited (White), 1: In Current Recursion Stack (Gray), 2: Verified Safe (Black)
  const state = new Map<string, number>();

  const hasCycleDfs = (node: string): boolean => {
    const nodeState = state.get(node) || 0;
    if (nodeState === 1) return true; // Cycle detected: back-edge to ancestor in current path!
    if (nodeState === 2) return false; // Already verified acyclic

    state.set(node, 1);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (hasCycleDfs(neighbor)) return true;
    }

    state.set(node, 2);
    return false;
  };

  // Check path starting from taskId
  if (hasCycleDfs(taskId)) return true;

  // Check all connected components
  for (const node of graph.keys()) {
    if ((state.get(node) || 0) === 0) {
      if (hasCycleDfs(node)) return true;
    }
  }

  return false;
}

/**
 * Generates next sequential task ID (e.g. TSK-110).
 */
export function generateNextTaskId(tasks: { id: string }[]): string {
  let maxNum = 100;
  for (const t of tasks) {
    const match = String(t.id).match(/TSK-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `TSK-${maxNum + 1}`;
}
