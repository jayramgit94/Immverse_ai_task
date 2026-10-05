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
} from '@/lib/types';
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

export default function SmartTaskManager() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  // Fetch Users
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && data.data) {
        setUsers(data.data);
        if (!currentUser && data.data.length > 0) {
          setCurrentUser(data.data[0]);
        }
      }
    } catch {
      showToast('Could not load team members', 'error');
    }
  };

  // Fetch Tasks
  const loadTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success && data.data) {
        setTasks(data.data);
      }
    } catch {
      showToast('Could not load workspace tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadTasks();
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

  // Switch session user
  const handleSelectUser = async (user: User) => {
    setCurrentUser(user);
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

  // Inline Status Change with Blocker Guardrail
  const handleStatusChange = async (task: TaskWithDetails, nextStatus: TaskStatus) => {
    if (nextStatus === 'Done' && task.isBlocked) {
      handleBlockedAttempt(task);
      return;
    }

    setBlockedAlertTask(null);

    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setTasks(previousTasks);
        showToast(data.error || 'Cannot update task status', 'error');
        if (task.isBlocked) {
          handleBlockedAttempt(task);
        }
        return;
      }

      // Refresh to update dependent statuses across the workspace graph
      await loadTasks();
      showToast(`${task.id} marked as ${nextStatus}`);
    } catch {
      setTasks(previousTasks);
      showToast('Network error while updating task', 'error');
    }
  };

  // Inline Assignee Change
  const handleAssigneeChange = async (task: TaskWithDetails, newUserId: string) => {
    const assignee = users.find((u) => u.id === newUserId);
    const previousTasks = [...tasks];

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, assignedUserId: newUserId, assignee } : t
      )
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedUserId: newUserId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setTasks(previousTasks);
        showToast(data.error || 'Failed to reassign task', 'error');
        return;
      }

      showToast(`Reassigned ${task.id} to ${assignee?.name.split(' ')[0]}`);
      await loadTasks();
    } catch {
      setTasks(previousTasks);
      showToast('Network error while reassigning task', 'error');
    }
  };

  // Blocked Attempt Handler (gentle alert & toast)
  const handleBlockedAttempt = (task: TaskWithDetails) => {
    setBlockedAlertTask(task);
    const blockerNames = task.blockingTasks.map((t) => t.id).join(', ');
    showToast(`Cannot complete ${task.id}: blocked by ${blockerNames}`, 'warning');
  };

  // Inline Quick Task Creation (Linear / Notion style: Enter to create)
  const handleQuickCreate = async (title: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          priority: 'Medium',
          status: 'To Do',
          assignedUserId: currentUser?.id || users[0]?.id || 'USR-1',
          dependencyIds: [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not create task');
      }

      showToast(`Created ${data.data?.id}`);
      await loadTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error creating task', 'error');
    }
  };

  // Full Task Save (Modal Sheet)
  const handleSaveTask = async (
    payload: CreateTaskInput | UpdateTaskInput,
    isEdit: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const url = isEdit && editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'Server rejected update';
        showToast(errorMsg, 'error');
        return { success: false, error: errorMsg };
      }

      showToast(isEdit ? `Saved ${editingTask?.id}` : `Created ${data.data?.id}`);
      setEditingTask(null);
      await loadTasks();
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error saving task';
      showToast(errorMsg, 'error');
      return { success: false, error: errorMsg };
    }
  };

  // Delete Task with Cascade Cleanup
  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not delete task');
      }

      showToast(`Deleted ${id} and cleaned dependencies`);
      await loadTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error deleting task', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans antialiased">
      {/* HEADER: RESPONSIVE APP BAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          {/* DESKTOP HEADER (>= 768px): SINGLE SLEEK ROW */}
          <div className="hidden md:flex h-14 items-center justify-between gap-4">
            {/* LEFT: Workspace title & Live Tabs */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <span className="text-gray-400">workspace</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 font-semibold text-sm">Tasks</span>
              </div>

              {/* View Switcher Tabs with Live Counts */}
              <div className="flex items-center p-0.5 bg-gray-100 rounded-md border border-[#E5E7EB]">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All ({tasks.length})
                </button>

                <button
                  onClick={() => setActiveTab('my-tasks')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'my-tasks'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  My Tasks ({myTasksCount})
                </button>

                <button
                  onClick={() => setActiveTab('blocked')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                    activeTab === 'blocked'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <span>Blocked ({blockedCount})</span>
                  {blockedCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                  )}
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
                onUserCreated={(newUser) => {
                  setUsers((prev) => [...prev, newUser]);
                  showToast(`Added ${newUser.name}`);
                }}
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium min-w-0">
                <span className="text-gray-400">workspace</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 font-bold text-sm tracking-tight">Tasks</span>
                <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-mono bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                  {filteredTasks.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Sync Button */}
                <button
                  onClick={() => {
                    setIsLoading(true);
                    loadTasks();
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 active:bg-gray-100 rounded transition-colors"
                  title="Sync tasks"
                >
                  <RotateCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>

                {/* User Switcher */}
                <UserSwitcher
                  currentUser={currentUser}
                  users={users}
                  onSelectUser={handleSelectUser}
                  onUserCreated={(newUser) => {
                    setUsers((prev) => [...prev, newUser]);
                    showToast(`Added ${newUser.name}`);
                  }}
                />

                {/* + New Button */}
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-gray-900 hover:bg-black active:scale-95 rounded-md transition-all shadow-sm flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* ROW 2: Mobile View Switcher Segmented Control */}
            <div className="grid grid-cols-3 p-0.5 bg-gray-100 rounded-lg border border-[#E5E7EB]">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All ({tasks.length})
              </button>

              <button
                onClick={() => setActiveTab('my-tasks')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'my-tasks'
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                My Tasks ({myTasksCount})
              </button>

              <button
                onClick={() => setActiveTab('blocked')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'blocked'
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>Blocked ({blockedCount})</span>
                {blockedCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0 animate-pulse" />
                )}
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
