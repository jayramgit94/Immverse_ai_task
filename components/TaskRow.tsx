'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TaskWithDetails, TaskStatus, User } from '@/lib/types';
import {
  CheckCircle2,
  Circle,
  Lock,
  Pencil,
  Trash2,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

interface TaskRowProps {
  task: TaskWithDetails;
  users: User[];
  isHighlighted?: boolean;
  onEdit: (task: TaskWithDetails) => void;
  onDelete: (id: string) => void;
  onStatusChange: (task: TaskWithDetails, nextStatus: TaskStatus) => void;
  onAssigneeChange: (task: TaskWithDetails, newUserId: string) => void;
  onBlockedAttempt: (task: TaskWithDetails) => void;
  onScrollToTask?: (taskId: string) => void;
}

export function TaskRow({
  task,
  users,
  isHighlighted = false,
  onEdit,
  onDelete,
  onStatusChange,
  onAssigneeChange,
  onBlockedAttempt,
  onScrollToTask,
}: TaskRowProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(e.target as Node)
      ) {
        setShowAssigneeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDone = task.status === 'Done';
  const isInProgress = task.status === 'In Progress';

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDone) {
      onStatusChange(task, 'To Do');
    } else {
      if (task.isBlocked) {
        onBlockedAttempt(task);
        return;
      }
      onStatusChange(task, 'Done');
    }
  };

  const handleStatusSelect = (newStatus: TaskStatus) => {
    setShowStatusDropdown(false);
    if (newStatus === 'Done' && task.isBlocked) {
      onBlockedAttempt(task);
      return;
    }
    onStatusChange(task, newStatus);
  };

  const blockerTooltipText = task.isBlocked
    ? `Blocked by: ${task.blockingTasks.map((t) => `${t.id} (${t.title})`).join(', ')}`
    : '';

  return (
    <div
      id={`task-row-${task.id}`}
      onClick={() => onEdit(task)}
      className={`group relative border-b border-[#E5E7EB] transition-all duration-200 cursor-pointer ${
        isHighlighted
          ? 'bg-amber-50/80 ring-2 ring-amber-400 z-10'
          : isDone
          ? 'bg-[#FAFAFA]/50 hover:bg-[#F3F4F6]/60'
          : 'bg-white hover:bg-[#FAFAFA]'
      }`}
    >
      {/* DESKTOP ROW (md and above) */}
      <div className="hidden md:flex items-center px-4 py-2.5 gap-4">
        {/* COLUMN 1: Completion Control + ID + Title + Blocker Tag */}
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
          {/* Completion Checkbox */}
          <button
            type="button"
            onClick={handleCheckboxClick}
            title={task.isBlocked ? blockerTooltipText : isDone ? 'Mark To Do' : 'Mark Done'}
            className={`flex-shrink-0 p-0.5 rounded transition-transform active:scale-95 focus:outline-none ${
              task.isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isDone ? (
              <CheckCircle2
                className="w-4 h-4 text-emerald-600 fill-emerald-50"
                strokeWidth={1.5}
              />
            ) : task.isBlocked ? (
              <div
                className="w-4 h-4 rounded-full border border-rose-300 bg-rose-50 flex items-center justify-center text-rose-600"
                title={blockerTooltipText}
              >
                <Lock className="w-2.5 h-2.5" strokeWidth={1.5} />
              </div>
            ) : (
              <Circle
                className="w-4 h-4 text-gray-300 hover:text-gray-500"
                strokeWidth={1.5}
              />
            )}
          </button>

          {/* Task ID (Tabular Monospace) */}
          <span className="font-mono text-xs text-gray-400 tabular-nums flex-shrink-0 select-none">
            {task.id}
          </span>

          {/* Crisp Title */}
          <span
            className={`text-sm font-medium tracking-tight truncate ${
              isDone ? 'line-through text-gray-400' : 'text-gray-900'
            }`}
          >
            {task.title}
          </span>

          {/* Dependency & Blocker Tags */}
          {task.isBlocked ? (
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {task.blockingTasks.map((blocker) => (
                <button
                  key={blocker.id}
                  type="button"
                  onClick={() => onScrollToTask?.(blocker.id)}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                  title={`Click to jump to blocker ${blocker.id}: ${blocker.title}`}
                >
                  <AlertCircle className="w-2.5 h-2.5 text-rose-600" strokeWidth={1.5} />
                  <span>Blocked by {blocker.id}</span>
                </button>
              ))}
            </div>
          ) : task.dependencies && task.dependencies.length > 0 ? (
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded"
                title={`Prerequisites resolved: ${task.dependencies.map((d) => d.id).join(', ')}`}
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" strokeWidth={1.5} />
                <span>{task.dependencies.length} dep{task.dependencies.length > 1 ? 's' : ''} resolved</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* COLUMN 2: Priority (Colored dot + Text) */}
        <div className="w-24 flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              task.priority === 'High'
                ? 'bg-red-500'
                : task.priority === 'Medium'
                ? 'bg-amber-500'
                : 'bg-gray-400'
            }`}
          />
          <span className="font-normal">{task.priority}</span>
        </div>

        {/* COLUMN 3: Status (Sleek Inline Dropdown) */}
        <div
          className="w-32 flex-shrink-0 relative"
          ref={statusDropdownRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className={`inline-flex items-center justify-between w-28 px-2 py-1 text-xs rounded border transition-colors ${
              isDone
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isInProgress
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span className="truncate font-medium">{task.status}</span>
            <ChevronDown className="w-3 h-3 text-gray-400 ml-1 flex-shrink-0" strokeWidth={1.5} />
          </button>

          {showStatusDropdown && (
            <div className="absolute left-0 mt-1 w-32 bg-white border border-[#E5E7EB] rounded-md shadow-lg py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
              {(['To Do', 'In Progress', 'Done'] as TaskStatus[]).map((s) => {
                const isSelected = task.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusSelect(s)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-gray-100 font-medium text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span>{s}</span>
                    {s === 'Done' && task.isBlocked && (
                      <Lock className="w-3 h-3 text-rose-500 ml-1" strokeWidth={1.5} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 4: Assignee (Inline Dropdown) */}
        <div
          className="w-36 flex-shrink-0 relative"
          ref={assigneeDropdownRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
            className="flex items-center gap-2 p-1 -m-1 rounded hover:bg-gray-100 transition-colors text-left max-w-full"
            title="Click to reassign"
          >
            {task.assignee ? (
              <>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono text-white flex-shrink-0 font-medium"
                  style={{ backgroundColor: task.assignee.avatarColor }}
                >
                  {task.assignee.initials}
                </div>
                <span className="text-xs text-gray-700 truncate font-normal">
                  {task.assignee.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400">Unassigned</span>
            )}
          </button>

          {showAssigneeDropdown && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E5E7EB] rounded-md shadow-lg py-1 z-20 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                Reassign to
              </div>
              {users.map((u) => {
                const isCurrent = task.assignedUserId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setShowAssigneeDropdown(false);
                      onAssigneeChange(task, u.id);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono text-white flex-shrink-0"
                      style={{ backgroundColor: u.avatarColor }}
                    >
                      {u.initials}
                    </div>
                    <span className="truncate">{u.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 5: Actions (Hover Delete/Edit) */}
        <div
          className="w-14 flex-shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Edit task"
          >
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* MOBILE STACKED CARD VIEW (< 768px) */}
      <div className="md:hidden p-3.5 space-y-2.5">
        <div className="flex items-start gap-2.5">
          {/* Touch-Friendly Checkbox (44px min tap area) */}
          <button
            type="button"
            onClick={handleCheckboxClick}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded -ml-1 text-gray-400 active:scale-95 focus:outline-none ${
              task.isBlocked ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isDone ? (
              <CheckCircle2
                className="w-5 h-5 text-emerald-600 fill-emerald-50"
                strokeWidth={1.5}
              />
            ) : task.isBlocked ? (
              <div className="w-5 h-5 rounded-full border border-rose-300 bg-rose-50 flex items-center justify-center text-rose-600">
                <Lock className="w-3 h-3" strokeWidth={1.5} />
              </div>
            ) : (
              <Circle className="w-5 h-5 text-gray-300" strokeWidth={1.5} />
            )}
          </button>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-gray-400 font-medium whitespace-nowrap flex-shrink-0 mt-0.5">
                {task.id}
              </span>
              <h3
                className={`text-sm font-medium leading-snug break-words ${
                  isDone ? 'line-through text-gray-400' : 'text-gray-900'
                }`}
              >
                {task.title}
              </h3>
            </div>

            {/* Mobile Blocker or Resolved Tag */}
            {task.isBlocked ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {task.blockingTasks.map((blocker) => (
                  <button
                    key={blocker.id}
                    type="button"
                    onClick={() => onScrollToTask?.(blocker.id)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono text-rose-700 bg-rose-50 border border-rose-200 rounded active:bg-rose-100 transition-colors"
                  >
                    <AlertCircle className="w-3 h-3 text-rose-600 flex-shrink-0" strokeWidth={1.5} />
                    <span className="whitespace-nowrap">Blocked by {blocker.id}</span>
                  </button>
                ))}
              </div>
            ) : task.dependencies && task.dependencies.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" strokeWidth={1.5} />
                  <span className="whitespace-nowrap">{task.dependencies.length} dep{task.dependencies.length > 1 ? 's' : ''} resolved</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Controls Row (44px touch targets) */}
        <div
          className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <select
              value={task.status}
              onChange={(e) => handleStatusSelect(e.target.value as TaskStatus)}
              className={`h-8 px-2 py-0.5 rounded border text-xs font-medium focus:outline-none transition-colors ${
                isDone
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isInProgress
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>

            <span className="flex items-center gap-1 text-gray-500 text-xs">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  task.priority === 'High'
                    ? 'bg-red-500'
                    : task.priority === 'Medium'
                    ? 'bg-amber-500'
                    : 'bg-gray-400'
                }`}
              />
              {task.priority}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Interactive Assignee on Mobile */}
            <div className="relative" title="Change assignee">
              <select
                value={task.assignedUserId}
                onChange={(e) => onAssigneeChange(task, e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors">
                {task.assignee ? (
                  <>
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono text-white flex-shrink-0"
                      style={{ backgroundColor: task.assignee.avatarColor }}
                    >
                      {task.assignee.initials}
                    </div>
                    <span className="text-xs text-gray-600 truncate max-w-[70px]">
                      {task.assignee.name.split(' ')[0]}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">Assign</span>
                )}
                <ChevronDown className="w-2.5 h-2.5 text-gray-400" strokeWidth={1.5} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => onEdit(task)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 active:bg-gray-100 rounded transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-rose-600 active:bg-rose-50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
