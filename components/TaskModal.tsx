'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TaskWithDetails,
  User,
  TaskPriority,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/lib/types';
import { X, Search, Check, AlertCircle, Trash2 } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: TaskWithDetails | null;
  allTasks: TaskWithDetails[];
  users: User[];
  currentUserId: string;
  onSave: (
    payload: CreateTaskInput | UpdateTaskInput,
    isEdit: boolean
  ) => Promise<{ success: boolean; error?: string } | boolean>;
  onDelete?: (id: string) => Promise<void>;
}

export function TaskModal({
  isOpen,
  onClose,
  taskToEdit,
  allTasks,
  users,
  currentUserId,
  onSave,
  onDelete,
}: TaskModalProps) {
  const isEdit = Boolean(taskToEdit);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [dependencySearch, setDependencySearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setAssignedUserId(taskToEdit.assignedUserId);
      setSelectedDependencies(taskToEdit.dependencyIds || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setStatus('To Do');
      setAssignedUserId(currentUserId || (users[0]?.id ?? 'USR-1'));
      setSelectedDependencies([]);
    }
    setDependencySearch('');
    setErrorMessage(null);
  }, [taskToEdit, currentUserId, users, isOpen]);

  // Keyboard support: Escape to dismiss, Cmd/Ctrl+Enter to save
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleSubmit();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, description, priority, status, assignedUserId, selectedDependencies]);

  // Determine which tasks can be chosen as prerequisites
  // Prevent self-dependency and direct circular dependency
  const availablePrerequisites = useMemo(() => {
    return allTasks.filter((candidate) => {
      // Cannot depend on self
      if (taskToEdit && candidate.id === taskToEdit.id) return false;

      // Cannot depend on a task that already depends on this task (cycle prevention)
      if (taskToEdit && candidate.dependencyIds?.includes(taskToEdit.id)) return false;

      return true;
    });
  }, [allTasks, taskToEdit]);

  const filteredPrerequisites = useMemo(() => {
    if (!dependencySearch.trim()) return availablePrerequisites;
    const q = dependencySearch.toLowerCase().trim();
    return availablePrerequisites.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q)
    );
  }, [availablePrerequisites, dependencySearch]);

  const toggleDependency = (depId: string) => {
    setSelectedDependencies((prev) =>
      prev.includes(depId) ? prev.filter((id) => id !== depId) : [...prev, depId]
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('Task title is required');
      return;
    }

    // Client-side blocker completion guardrail
    if (status === 'Done') {
      const pendingBlockers = selectedDependencies
        .map((depId) => allTasks.find((t) => t.id === depId))
        .filter((t) => t && t.status !== 'Done');

      if (pendingBlockers.length > 0) {
        setErrorMessage(
          `Cannot mark as Done: blocked by ${pendingBlockers.length} pending task${
            pendingBlockers.length === 1 ? '' : 's'
          }: ${pendingBlockers.map((b) => b?.id).join(', ')}.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateTaskInput | UpdateTaskInput = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        assignedUserId: assignedUserId || users[0]?.id || 'USR-1',
        dependencyIds: selectedDependencies,
      };

      const result = await onSave(payload, isEdit);
      if (typeof result === 'boolean') {
        if (result) onClose();
      } else if (result.success) {
        onClose();
      } else if (result.error) {
        setErrorMessage(result.error);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-100">
      <div
        className="w-full sm:max-w-lg bg-white border-t sm:border border-[#E5E7EB] rounded-t-2xl sm:rounded-lg shadow-xl flex flex-col max-h-[88vh] sm:max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">
              {isEdit ? taskToEdit?.id : 'NEW'}
            </span>
            <span className="text-gray-300">/</span>
            <h2 className="text-sm font-semibold text-gray-900">
              {isEdit ? 'Edit Task' : 'New Task'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Design onboarding user flow"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Add optional notes or specs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          {/* Priority & Status Rows */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Assignee
            </label>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.role}
                </option>
              ))}
            </select>
          </div>

          {/* Searchable Prerequisites Combobox / Checklist */}
          <div className="pt-2 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-800">
                Depends on ({selectedDependencies.length} selected)
              </label>
              {selectedDependencies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDependencies([])}
                  className="text-[11px] text-gray-400 hover:text-gray-700"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Search filter for prerequisites */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search prerequisite tasks..."
                value={dependencySearch}
                onChange={(e) => setDependencySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-gray-50 border border-[#E5E7EB] rounded text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white"
              />
            </div>

            {/* Prerequisites Checklist */}
            <div className="border border-[#E5E7EB] rounded-md max-h-36 overflow-y-auto divide-y divide-[#E5E7EB] bg-white">
              {filteredPrerequisites.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-400">
                  No eligible prerequisite tasks found.
                </div>
              ) : (
                filteredPrerequisites.map((candidate) => {
                  const isChecked = selectedDependencies.includes(candidate.id);
                  const isDone = candidate.status === 'Done';

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => toggleDependency(candidate.id)}
                      className={`flex items-start gap-2.5 p-2 text-xs cursor-pointer hover:bg-gray-50 transition-colors ${
                        isChecked ? 'bg-gray-50/70' : ''
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 mt-0.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-gray-900 border-gray-900 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5" strokeWidth={2} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-gray-400">
                            {candidate.id}
                          </span>
                          <span
                            className={`text-[10px] px-1 rounded font-normal ${
                              isDone
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-gray-500 bg-gray-100'
                            }`}
                          >
                            {candidate.status}
                          </span>
                        </div>
                        <div className="text-gray-900 font-normal truncate mt-0.5">
                          {candidate.title}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA]">
          <div>
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Delete ${taskToEdit?.id}? Dependencies will be cleaned.`)) {
                    await onDelete(taskToEdit!.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-[#E5E7EB] rounded-md bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
