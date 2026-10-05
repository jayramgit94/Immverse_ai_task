'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { TaskWithDetails, TaskStatus, User } from '@/lib/types';
import { TaskRow } from './TaskRow';
import { EmptyState } from './EmptyState';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Total tasks & pages
  const totalTasks = tasks.length;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalTasks / pageSize)) : 1;

  // Clamped page number
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  // Reset to page 1 when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTabName]);

  // Auto-navigate to page containing highlightedTaskId (e.g. from blocker jump)
  useEffect(() => {
    if (highlightedTaskId && pageSize > 0) {
      const taskIndex = tasks.findIndex((t) => t.id === highlightedTaskId);
      if (taskIndex !== -1) {
        const targetPage = Math.floor(taskIndex / pageSize) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  }, [highlightedTaskId, tasks, pageSize, currentPage]);

  // Paginated slice
  const displayedTasks = useMemo(() => {
    if (pageSize <= 0) return tasks;
    const startIndex = (safePage - 1) * pageSize;
    return tasks.slice(startIndex, startIndex + pageSize);
  }, [tasks, safePage, pageSize]);

  const startItem = totalTasks === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = totalTasks === 0 ? 0 : Math.min(safePage * pageSize, totalTasks);

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
        className="flex items-center gap-3 px-3.5 sm:px-4 py-2.5 border-b border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]/50 transition-colors"
      >
        <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Add task... (Press Enter to create)"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          disabled={isCreatingQuick}
          className="w-full min-w-0 text-xs sm:text-sm bg-transparent placeholder:text-gray-400 text-gray-900 focus:outline-none"
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
          {displayedTasks.map((task) => (
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

      {/* PAGINATION & FOOTER CONTROLS */}
      {totalTasks > 0 && (
        <div className="px-3.5 sm:px-4 py-2.5 bg-[#FAFAFA] border-t border-[#E5E7EB] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs select-none">
          {/* LEFT: Range info + Page Size selector */}
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-gray-600">
              <span className="font-semibold text-gray-900 tabular-nums">
                {pageSize > 0 ? `${startItem}–${endItem}` : `1–${totalTasks}`}
              </span>
              <span className="text-gray-400">of</span>
              <span className="font-semibold text-gray-900 tabular-nums">{totalTasks}</span>
              <span className="text-gray-500">task{totalTasks > 1 ? 's' : ''}</span>
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200 text-gray-500">
              <span className="text-[11px] text-gray-400 hidden xs:inline">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#E5E7EB] rounded px-1.5 py-1 text-xs text-gray-800 focus:outline-none cursor-pointer font-medium shadow-xs"
              >
                <option value={10}>10 / page</option>
                <option value={15}>15 / page</option>
                <option value={25}>25 / page</option>
                <option value={-1}>All</option>
              </select>
            </div>
          </div>

          {/* RIGHT: Page navigation buttons */}
          {pageSize > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
              {/* Prev Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-[#E5E7EB] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:bg-gray-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="hidden xs:inline">Prev</span>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === safePage;
                  if (
                    totalPages > 5 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - safePage) > 1
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return (
                        <span key={pageNum} className="text-gray-400 px-0.5 text-xs">
                          …
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[26px] h-6 px-1.5 flex items-center justify-center text-xs rounded font-medium transition-all ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-xs font-semibold'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-[#E5E7EB]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-[#E5E7EB] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:bg-gray-100"
              >
                <span className="hidden xs:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
