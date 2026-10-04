'use client';

import React from 'react';
import { TaskWithDetails } from '@/lib/types';
import { AlertCircle, X } from 'lucide-react';

interface BlockerAlertBannerProps {
  blockedTask: TaskWithDetails | null;
  onClose: () => void;
}

export function BlockerAlertBanner({
  blockedTask,
  onClose,
}: BlockerAlertBannerProps) {
  if (!blockedTask) return null;

  return (
    <div className="p-3 bg-[#FEF2F2] border border-rose-200 rounded-lg flex items-start justify-between gap-3 animate-in fade-in duration-150">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <h4 className="text-xs font-semibold text-rose-700">
            Cannot complete {blockedTask.id}: Prerequisite tasks pending
          </h4>
          <p className="text-xs text-rose-600 mt-0.5 font-normal">
            The following prerequisite{blockedTask.blockingTasks.length > 1 ? 's must' : ' must'} be marked as Done first:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {blockedTask.blockingTasks.map((blocker) => (
              <span
                key={blocker.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs bg-white border border-rose-200 rounded text-gray-800"
              >
                <span className="font-mono text-[11px] text-rose-600 font-medium">
                  {blocker.id}
                </span>
                <span className="truncate max-w-[200px] text-gray-700 font-normal">
                  {blocker.title}
                </span>
                <span className="text-[10px] text-gray-400">
                  ({blocker.status})
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
        title="Dismiss alert"
      >
        <X className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
