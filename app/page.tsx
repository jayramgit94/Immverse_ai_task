'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TaskWithDetails,
  User,
  TaskPriority,
  TaskStatus,
  ViewTab,
  CreateTaskInput,
  UpdateTaskInput,
  Task,
} from '@/lib/types';
import { SEED_USERS, SEED_TASKS } from '@/lib/store';
import { enrichTasks, detectCycle, generateNextTaskId } from '@/lib/todoSync';
import { UserSwitcher } from '@/components/UserSwitcher';
import { TaskTable } from '@/components/TaskTable';
import { TaskModal } from '@/components/TaskModal';
import { BlockerAlertBanner } from '@/components/BlockerAlertBanner';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCw,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'todos_cache';
const USERS_CACHE_KEY = 'workspace_custom_users';
const ACTIVE_USER_ID_KEY = 'workspace_active_user_id';

export default function SmartTaskManager() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(SEED_USERS[0]);
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  // Modals & Feedback
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [blockedAlertTask, setBlockedAlertTask] = useState<TaskWithDetails | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, []);

  // Fetch & Restore Users with persistent custom users & active session
  const loadUsers = async (): Promise<User[]> => {
    // 1. Read custom created users from localStorage
    let cachedCustomUsers: User[] = [];
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(USERS_CACHE_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          cachedCustomUsers = parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading cached custom users', e);
    }

    // 2. Fetch server users
    let serverUsers: User[] = [];
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        serverUsers = data.data;
      }
    } catch {
      // Offline fallback
    }

    // 3. Merge SEED_USERS, server users, and custom users uniquely by ID
    const userMap = new Map<string, User>();
    for (const u of SEED_USERS) userMap.set(u.id, u);
    for (const u of serverUsers) userMap.set(u.id, u);
    for (const u of cachedCustomUsers) userMap.set(u.id, u);

    const mergedUsers = Array.from(userMap.values());
    setUsers(mergedUsers);

    // 4. Restore active user session from localStorage
    let restoredUser: User | null = null;
    try {
      const savedActiveId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_USER_ID_KEY) : null;
      if (savedActiveId) {
        restoredUser = mergedUsers.find((u) => u.id === savedActiveId) || null;
      }
    } catch (e) {}

    const selected = restoredUser || mergedUsers[0] || SEED_USERS[0];
    setCurrentUser(selected);
    return mergedUsers;
  };

  // Fetch Tasks from GET /api/todos with offline fallback
  const loadTasks = async (userList?: User[]) => {
    const activeUsers = userList && userList.length > 0 ? userList : users.length > 0 ? users : SEED_USERS;
    setIsLoading(true);
    try {
      const res = await fetch('/api/todos');
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      let todosArray: any[] = [];
      if (Array.isArray(data)) {
        todosArray = data;
      } else if (data && Array.isArray(data.todos)) {
        todosArray = data.todos;
      }

      // Offline Fallback Caching:
      // Cache the latest successfully fetched tasks in localStorage as a fallback
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(todosArray));
      } catch (cacheErr) {
        console.warn('Could not cache tasks in localStorage', cacheErr);
      }

      const enriched = enrichTasks(todosArray, activeUsers);
      setTasks(enriched);
    } catch (err) {
      console.warn('Network call to /api/todos failed, falling back to localStorage:', err);
      // Fallback to localStorage cache in case device temporarily loses connectivity
      let restored = false;
      try {
        const cached = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const enriched = enrichTasks(parsed, activeUsers);
            setTasks(enriched);
            restored = true;
            showToast('Loaded tasks from local cache', 'warning');
          }
        }
      } catch (cacheErr) {
        console.warn('Error reading from localStorage cache', cacheErr);
      }

      if (!restored) {
        // If first launch without credentials or local cache, initialize with seed tasks
        const enrichedSeed = enrichTasks(SEED_TASKS, activeUsers);
        setTasks(enrichedSeed);
        showToast(
          err instanceof Error
            ? `Sync error (${err.message}). Showing offline tasks.`
            : 'Offline mode: loaded offline tasks.',
          'warning'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      const loadedUsers = await loadUsers();
      if (isMounted) {
        await loadTasks(loadedUsers);
      }
    };
    initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Tab view filter
    if (activeTab === 'my-tasks' && currentUser) {
      result = result.filter((t) => t.assignedUserId === currentUser.id);
    } else if (activeTab === 'blocked') {
      result = result.filter((t) => t.isBlocked);
    }

    // Priority filter
    if (priorityFilter !== 'All') {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    // Quick search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignee?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tasks, activeTab, currentUser, priorityFilter, searchQuery]);

  const blockedCount = useMemo(() => {
    return tasks.filter((t) => t.isBlocked).length;
  }, [tasks]);

  const myTasksCount = useMemo(() => {
    return currentUser ? tasks.filter((t) => t.assignedUserId === currentUser.id).length : 0;
  }, [tasks, currentUser]);

  // Switch session user & persist active session to localStorage
  const handleSelectUser = async (user: User) => {
    setCurrentUser(user);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ACTIVE_USER_ID_KEY, user.id);
      }
    } catch (e) {
      console.warn('Failed to persist active user', e);
    }

    try {
      await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      showToast(`Active session: ${user.name}`);
    } catch {
      showToast(`Active session: ${user.name}`);
    }
  };

  // Add new team member & persist to custom users cache in localStorage
  const handleUserCreated = (newUser: User) => {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === newUser.id);
      const updated = exists ? prev : [...prev, newUser];
      try {
        if (typeof window !== 'undefined') {
          const custom = updated.filter((u) => !SEED_USERS.some((s) => s.id === u.id));
          localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(custom));
        }
      } catch (e) {
        console.warn('Failed to cache new user', e);
      }
      return updated;
    });

    handleSelectUser(newUser);
    showToast(`Added and switched to ${newUser.name}`);
  };

  // Jump to and highlight a specific task (e.g. from a blocker link)
  const handleScrollToTask = (taskId: string) => {
    // If not in the current tab list, switch to 'all' so the row is rendered in the DOM
    const isVisibleInCurrentView = filteredTasks.some((t) => t.id === taskId);
    if (!isVisibleInCurrentView) {
      setActiveTab('all');
      setSearchQuery('');
      setPriorityFilter('All');
    }

    setTimeout(() => {
      const el = document.getElementById(`task-row-${taskId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedTaskId(taskId);
        setTimeout(() => setHighlightedTaskId(null), 2500);
      }
    }, 80);

    const taskObj = tasks.find((t) => t.id === taskId);
    showToast(`Jumped to prerequisite ${taskId}${taskObj ? `: "${taskObj.title}"` : ''}`);
  };

  // Central Optimistic State Synchronization
  const syncTodos = async (
    updatedTasks: TaskWithDetails[],
    previousTasks: TaskWithDetails[],
    successMessage?: string
  ): Promise<boolean> => {
    // 1. Optimistic Update: Immediately update UI for zero perceived latency
    setTasks(updatedTasks);

    // 2. Cache in localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTasks));
    } catch (e) {
      console.warn('Failed to update localStorage cache', e);
    }

    // 3. Send updated array to POST /api/todos
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTasks),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        // Revert to previous snapshot on failure
        setTasks(previousTasks);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(previousTasks));
        } catch (e) {}

        const errorMsg = data?.error || `Server responded with ${res.status}`;
        showToast(`Sync failed: ${errorMsg}. Changes reverted.`, 'error');
        return false;
      }

      if (successMessage) {
        showToast(successMessage, 'success');
      }
      return true;
    } catch (err) {
      // Revert to previous snapshot on exception
      setTasks(previousTasks);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(previousTasks));
      } catch (e) {}

      showToast(
        err instanceof Error
          ? `Sync failed (${err.message}). Changes reverted.`
          : 'Network error while syncing. Changes reverted.',
        'error'
      );
      return false;
    }
  };

  // Inline Status Change with Blocker Guardrail
  const handleStatusChange = async (task: TaskWithDetails, nextStatus: TaskStatus) => {
    if (nextStatus === 'Done' && task.isBlocked) {
      handleBlockedAttempt(task);
      return;
    }

    setBlockedAlertTask(null);

    const previousTasks = [...tasks];
    const updatedRaw = tasks.map((t) =>
      t.id === task.id ? { ...t, status: nextStatus, updatedAt: new Date().toISOString() } : t
    );

    const enrichedUpdated = enrichTasks(updatedRaw, users);
    await syncTodos(enrichedUpdated, previousTasks, `${task.id} marked as ${nextStatus}`);
  };

  // Inline Assignee Change
  const handleAssigneeChange = async (task: TaskWithDetails, newUserId: string) => {
    const assignee = users.find((u) => u.id === newUserId);
    const previousTasks = [...tasks];

    const updatedRaw = tasks.map((t) =>
      t.id === task.id ? { ...t, assignedUserId: newUserId, updatedAt: new Date().toISOString() } : t
    );

    const enrichedUpdated = enrichTasks(updatedRaw, users);
    await syncTodos(
      enrichedUpdated,
      previousTasks,
      `Reassigned ${task.id} to ${assignee ? assignee.name.split(' ')[0] : 'teammate'}`
    );
  };

  // Blocked Attempt Handler (gentle alert & toast)
  const handleBlockedAttempt = (task: TaskWithDetails) => {
    setBlockedAlertTask(task);
    const blockerNames = task.blockingTasks.map((t) => t.id).join(', ');
    showToast(`Cannot complete ${task.id}: blocked by ${blockerNames}`, 'warning');
  };

  // Inline Quick Task Creation
  const handleQuickCreate = async (title: string) => {
    if (!title.trim()) return;

    const previousTasks = [...tasks];
    const newId = generateNextTaskId(tasks);
    const now = new Date().toISOString();

    const newTask: Task = {
      id: newId,
      title: title.trim(),
      description: '',
      priority: 'Medium',
      status: 'To Do',
      assignedUserId: currentUser?.id || users[0]?.id || 'USR-1',
      dependencyIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const updatedRaw = [newTask, ...tasks];
    const enrichedUpdated = enrichTasks(updatedRaw, users);
    await syncTodos(enrichedUpdated, previousTasks, `Created ${newId}`);
  };

  // Full Task Save (Modal Sheet)
  const handleSaveTask = async (
    payload: CreateTaskInput | UpdateTaskInput,
    isEdit: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    const previousTasks = [...tasks];
    const now = new Date().toISOString();

    if (isEdit && editingTask) {
      if (payload.dependencyIds && detectCycle(editingTask.id, payload.dependencyIds, tasks)) {
        const errorMsg = 'Cannot update dependencies: circular dependency detected.';
        showToast(errorMsg, 'error');
        return { success: false, error: errorMsg };
      }

      if (payload.status === 'Done') {
        const deps = payload.dependencyIds || editingTask.dependencyIds || [];
        const pendingBlockers = deps
          .map((id) => tasks.find((t) => t.id === id))
          .filter((t) => t && t.status !== 'Done');

        if (pendingBlockers.length > 0) {
          const errorMsg = `Cannot mark task as Done: blocked by pending prerequisite(s): ${pendingBlockers
            .map((b) => b?.id)
            .join(', ')}.`;
          showToast(errorMsg, 'error');
          return { success: false, error: errorMsg };
        }
      }

      const updatedRaw = tasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: payload.title !== undefined ? payload.title.trim() : t.title,
              description: payload.description !== undefined ? payload.description.trim() : t.description,
              priority: payload.priority || t.priority,
              status: payload.status || t.status,
              assignedUserId: payload.assignedUserId || t.assignedUserId,
              dependencyIds: payload.dependencyIds !== undefined ? payload.dependencyIds : t.dependencyIds,
              updatedAt: now,
            }
          : t
      );

      const enrichedUpdated = enrichTasks(updatedRaw, users);
      setEditingTask(null);

      const success = await syncTodos(enrichedUpdated, previousTasks, `Saved ${editingTask.id}`);
      return { success, error: success ? undefined : 'Failed to sync update to remote Gist' };
    } else {
      const newId = generateNextTaskId(tasks);
      const targetStatus = payload.status || 'To Do';

      if (targetStatus === 'Done') {
        const deps = payload.dependencyIds || [];
        const pendingBlockers = deps
          .map((id) => tasks.find((t) => t.id === id))
          .filter((t) => t && t.status !== 'Done');

        if (pendingBlockers.length > 0) {
          const errorMsg = `Cannot create task as Done: blocked by pending prerequisite(s): ${pendingBlockers
            .map((b) => b?.id)
            .join(', ')}.`;
          showToast(errorMsg, 'error');
          return { success: false, error: errorMsg };
        }
      }

      const newTask: Task = {
        id: newId,
        title: (payload.title || '').trim(),
        description: (payload.description || '').trim(),
        priority: payload.priority || 'Medium',
        status: targetStatus,
        assignedUserId: payload.assignedUserId || currentUser?.id || users[0]?.id || 'USR-1',
        dependencyIds: payload.dependencyIds || [],
        createdAt: now,
        updatedAt: now,
      };

      const updatedRaw = [newTask, ...tasks];
      const enrichedUpdated = enrichTasks(updatedRaw, users);

      const success = await syncTodos(enrichedUpdated, previousTasks, `Created ${newId}`);
      return { success, error: success ? undefined : 'Failed to save new task to remote Gist' };
    }
  };

  // Delete Task with Cascade Cleanup
  const handleDeleteTask = async (id: string) => {
    const previousTasks = [...tasks];

    const updatedRaw = tasks
      .filter((t) => t.id !== id)
      .map((t) => ({
        ...t,
        dependencyIds: (t.dependencyIds || []).filter((depId) => depId !== id),
        updatedAt: t.dependencyIds?.includes(id) ? new Date().toISOString() : t.updatedAt,
      }));

    const enrichedUpdated = enrichTasks(updatedRaw, users);
    await syncTodos(enrichedUpdated, previousTasks, `Deleted ${id} and cleaned dependencies`);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F9FAFB] text-gray-900 font-sans antialiased">
      {/* HEADER: RESPONSIVE APP BAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          {/* DESKTOP HEADER (>= 768px): SINGLE SLEEK ROW */}
          <div className="hidden md:flex h-14 items-center justify-between gap-4">
            {/* LEFT: Workspace title & Live Tabs */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-normal select-none">
                  <span>workspace</span>
                  <span className="text-gray-300">/</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-900 font-semibold text-sm tracking-tight">Tasks</span>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-mono font-medium text-gray-600 bg-gray-100 border border-gray-200/80 rounded-full select-none">
                    {filteredTasks.length}
                  </span>
                </div>
              </div>

              {/* View Switcher Tabs with Live Counts */}
              <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === 'all'
                      ? 'bg-white text-gray-900 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span className="whitespace-nowrap">All</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-mono font-medium rounded-full ${
                      activeTab === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-200/80 text-gray-600'
                    }`}
                  >
                    {tasks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('my-tasks')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === 'my-tasks'
                      ? 'bg-white text-gray-900 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span className="whitespace-nowrap">My Tasks</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-mono font-medium rounded-full ${
                      activeTab === 'my-tasks'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-200/80 text-gray-600'
                    }`}
                  >
                    {myTasksCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('blocked')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    activeTab === 'blocked'
                      ? 'bg-white text-rose-700 shadow-sm font-semibold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span className="whitespace-nowrap">Blocked</span>
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-mono font-medium rounded-full ${
                      blockedCount > 0
                        ? 'bg-rose-100 text-rose-700 border border-rose-200 font-semibold'
                        : activeTab === 'blocked'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-200/80 text-gray-600'
                    }`}
                  >
                    {blockedCount}
                  </span>
                </button>
              </div>
            </div>

            {/* RIGHT: Search + Priority Filter + User Switcher + Sync + "+ New Task" */}
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative w-44 lg:w-52">
                <Search
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                )}
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-600">
                <Filter className="w-3 h-3 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent text-xs text-gray-800 focus:outline-none cursor-pointer"
                >
                  <option value="All">Priority: All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* User Switcher */}
              <UserSwitcher
                currentUser={currentUser}
                users={users}
                onSelectUser={handleSelectUser}
                onUserCreated={handleUserCreated}
              />

              {/* Sync Button */}
              <button
                onClick={() => {
                  setIsLoading(true);
                  loadTasks();
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Sync tasks"
              >
                <RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>

              {/* + New Task Primary Action */}
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded-md transition-colors shadow-sm flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* MOBILE HEADER (< 768px): DEDICATED STRUCTURED MULTI-TIER LAYOUT (NO OVERFLOW/CLIPPING) */}
          <div className="md:hidden py-2.5 space-y-2.5">
            {/* ROW 1: Branding + Session User + Sync + New Task */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              {/* Brand Title & Count */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-gray-900 font-bold text-sm tracking-tight">Tasks</span>
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-mono font-medium text-gray-600 bg-gray-100 border border-gray-200/80 rounded-full select-none flex-shrink-0">
                  {filteredTasks.length}
                </span>
              </div>

              {/* Right Action Group: Sync, User Switcher, + New */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Sync Button */}
                <button
                  onClick={() => {
                    setIsLoading(true);
                    loadTasks();
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 active:bg-gray-100 rounded transition-colors flex-shrink-0"
                  title="Sync tasks"
                >
                  <RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>

                {/* User Switcher */}
                <UserSwitcher
                  currentUser={currentUser}
                  users={users}
                  onSelectUser={handleSelectUser}
                  onUserCreated={handleUserCreated}
                />

                {/* + New Button (Guaranteed fully visible, no overflow) */}
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-gray-900 hover:bg-black active:scale-95 rounded-md transition-all shadow-sm flex-shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* ROW 2: Mobile View Switcher Segmented Control */}
            <div className="grid grid-cols-3 p-0.5 bg-gray-100 rounded-lg border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="whitespace-nowrap">All</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-mono font-medium rounded-full ${
                    activeTab === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200/80 text-gray-600'
                  }`}
                >
                  {tasks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('my-tasks')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'my-tasks'
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="whitespace-nowrap">My Tasks</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-mono font-medium rounded-full ${
                    activeTab === 'my-tasks'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200/80 text-gray-600'
                  }`}
                >
                  {myTasksCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('blocked')}
                className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'blocked'
                    ? 'bg-white text-rose-700 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span className="whitespace-nowrap">Blocked</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-mono font-medium rounded-full ${
                    blockedCount > 0
                      ? 'bg-rose-100 text-rose-700 font-semibold border border-rose-200'
                      : activeTab === 'blocked'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-200/80 text-gray-600'
                  }`}
                >
                  {blockedCount}
                </span>
              </button>
            </div>

            {/* ROW 3: Full-width Search Input & Priority Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  strokeWidth={1.5}
                />
                <input
                  type="text"
                  placeholder="Search tasks or assignees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-600 flex-shrink-0 shadow-sm">
                <Filter className="w-3 h-3 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent text-xs text-gray-800 focus:outline-none cursor-pointer font-medium"
                >
                  <option value="All">Priority: All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-3.5 sm:py-5 space-y-3">
        {/* BLOCKER ALERT BANNER */}
        <BlockerAlertBanner
          blockedTask={blockedAlertTask}
          onClose={() => setBlockedAlertTask(null)}
        />

        {/* TASK DATA GRID */}
        {isLoading ? (
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-4 h-4 bg-gray-100 rounded-full" />
                <div className="w-12 h-3 bg-gray-100 rounded" />
                <div className="flex-1 h-3 bg-gray-100 rounded" />
                <div className="w-20 h-3 bg-gray-100 rounded hidden sm:block" />
                <div className="w-24 h-3 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <TaskTable
            tasks={filteredTasks}
            users={users}
            highlightedTaskId={highlightedTaskId}
            onEdit={(task) => {
              setEditingTask(task);
              setIsModalOpen(true);
            }}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            onBlockedAttempt={handleBlockedAttempt}
            onScrollToTask={handleScrollToTask}
            onQuickCreate={handleQuickCreate}
            onNewTaskClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            currentTabName={
              activeTab === 'all'
                ? 'All Tasks'
                : activeTab === 'my-tasks'
                ? 'My Tasks'
                : 'Blocked'
            }
          />
        )}
      </main>

      {/* TASK MODAL / SLIDE-OVER SHEET */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        taskToEdit={editingTask}
        allTasks={tasks}
        users={users}
        currentUserId={currentUser?.id || 'USR-1'}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      {/* GENTLE TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className={`px-3 py-2 text-xs rounded-md shadow-lg border flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-white border-[#E5E7EB] text-gray-900'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" strokeWidth={1.5} />
            ) : toast.type === 'warning' ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" strokeWidth={1.5} />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" strokeWidth={1.5} />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
