'use client';

import React, { useState } from 'react';
import { TaskWithDetails, TaskStatus, User } from '@/lib/types';
import { TaskRow } from './TaskRow';
import { EmptyState } from './EmptyState';
import { Plus } from 'lucide-react';

interface TaskTableProps {
  tasks: TaskWithDetails[];
  users: User[];
  highlightedTaskId?: string | null;
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (id: string) => void;
  onStatusChange: (task: TaskWithDetails, nextStatus: TaskStatus) => void;
  onAssigneeChange: (task: TaskWithDetails, newUserId: string) => void;
  onBlockedAttempt: (task: TaskWithDetails) => void;
  onScrollToTask?: (taskId: string) => void;
  onQuickCreate: (title: string) => Promise<void>;
  onNewTaskClick: () => void;
  currentTabName: string;
}

export function TaskTable({
  tasks,
  users,
  highlightedTaskId,
  onEdit,
  onDelete,
  onStatusChange,
  onAssigneeChange,
  onBlockedAttempt,
  onScrollToTask,
  onQuickCreate,
  onNewTaskClick,
  currentTabName,
}: TaskTableProps) {
  const [quickTitle, setQuickTitle] = useState('');
  const [isCreatingQuick, setIsCreatingQuick] = useState(false);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isCreatingQuick) return;

    setIsCreatingQuick(true);
    try {
      await onQuickCreate(quickTitle.trim());
      setQuickTitle('');
    } finally {
      setIsCreatingQuick(false);
    }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-sm">
      {/* DESKTOP TABLE HEADER */}
      <div className="hidden md:flex items-center px-4 py-2.5 bg-[#FAFAFA] border-b border-[#E5E7EB] text-xs font-medium text-gray-500 select-none">
        <span className="flex-1 min-w-0 font-normal">Task</span>
        <span className="w-24 flex-shrink-0 font-normal">Priority</span>
        <span className="w-32 flex-shrink-0 font-normal">Status</span>
        <span className="w-36 flex-shrink-0 font-normal">Assignee</span>
        <span className="w-14 flex-shrink-0" />
      </div>

      {/* INLINE QUICK-ENTRY ROW (LINEAR / NOTION STYLE) */}
      <form
        onSubmit={handleQuickSubmit}
        className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]/50 transition-colors"
      >
        <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Add task... (Press Enter to create)"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          disabled={isCreatingQuick}
          className="w-full text-xs sm:text-sm bg-transparent placeholder:text-gray-400 text-gray-900 focus:outline-none"
        />
        {quickTitle.trim() && (
          <button
            type="submit"
            disabled={isCreatingQuick}
            className="flex-shrink-0 text-xs px-2.5 py-1 bg-gray-900 text-white rounded font-medium hover:bg-black transition-colors"
          >
            {isCreatingQuick ? 'Adding...' : 'Enter'}
          </button>
        )}
      </form>

      {/* ROWS LIST */}
      {tasks.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title={
              currentTabName === 'Blocked'
                ? 'No blocked tasks'
                : currentTabName === 'My Tasks'
                ? 'No tasks assigned to you'
                : 'No tasks found'
            }
            description={
              currentTabName === 'Blocked'
                ? 'All tasks in this workspace have their prerequisites resolved.'
                : currentTabName === 'My Tasks'
                ? 'You do not have any tasks assigned in this workspace.'
                : 'No tasks match your current filter or search query.'
            }
            actionLabel={currentTabName !== 'Blocked' ? 'Create new task' : undefined}
            onAction={currentTabName !== 'Blocked' ? onNewTaskClick : undefined}
          />
        </div>
      ) : (
        <div className="divide-y divide-[#E5E7EB]">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              users={users}
              isHighlighted={highlightedTaskId === task.id}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onAssigneeChange={onAssigneeChange}
              onBlockedAttempt={onBlockedAttempt}
              onScrollToTask={onScrollToTask}
            />
          ))}
        </div>
      )}

      {/* SUBTLE FOOTER COUNTER */}
      {tasks.length > 0 && (
        <div className="px-4 py-2 bg-[#FAFAFA] border-t border-[#E5E7EB] flex items-center justify-between text-xs text-gray-400 font-mono">
          <span>{tasks.length} task{tasks.length > 1 ? 's' : ''}</span>
          <span className="hidden sm:inline font-sans text-[11px]">
            Press Enter on the quick-add row or click "+ New Task"
          </span>
        </div>
      )}
    </div>
  );
}
