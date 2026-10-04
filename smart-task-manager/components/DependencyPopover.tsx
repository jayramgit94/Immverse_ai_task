'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BlockingTaskSummary } from '@/lib/types';
import { CheckCircle2, Circle, Clock, GitCommit, AlertCircle } from 'lucide-react';

interface DependencyPopoverProps {
  dependencies: BlockingTaskSummary[];
  isBlocked: boolean;
}

export function DependencyPopover({ dependencies, isBlocked }: DependencyPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (dependencies.length === 0) {
    return <span className="text-ink-tertiary text-xs">None</span>;
  }

  const pendingCount = dependencies.filter((d) => d.status !== 'Done').length;

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
          isBlocked
            ? 'bg-blocker-subtle text-blocker border-blocker-border hover:bg-rose-100/60'
            : 'bg-canvas-subtle text-ink-secondary border-border hover:bg-canvas-muted'
        }`}
      >
        <GitCommit className="w-3 h-3 flex-shrink-0" />
        <span>{dependencies.length} dep{dependencies.length > 1 ? 's' : ''}</span>
        {pendingCount > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-blocker animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 bg-surface border border-border rounded-md shadow-popup p-3 z-30 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
            <span className="text-[11px] font-medium text-ink-secondary uppercase tracking-wider">
              Prerequisites ({dependencies.length})
            </span>
            {isBlocked ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blocker">
                <AlertCircle className="w-3 h-3" />
                <span>{pendingCount} pending</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                <CheckCircle2 className="w-3 h-3" />
                <span>All resolved</span>
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {dependencies.map((dep) => {
              const isResolved = dep.status === 'Done';
              return (
                <div
                  key={dep.id}
                  className="flex items-start gap-2 p-1.5 rounded bg-canvas-subtle/60 text-xs"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isResolved ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                    ) : dep.status === 'In Progress' ? (
                      <Clock className="w-3.5 h-3.5 text-warning" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-ink-tertiary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-medium text-ink-primary">
                        {dep.id}
                      </span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded font-sans ${
                          isResolved
                            ? 'text-success bg-success-subtle'
                            : dep.status === 'In Progress'
                            ? 'text-warning bg-warning-subtle'
                            : 'text-ink-tertiary bg-canvas-muted'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-secondary truncate mt-0.5">
                      {dep.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-2.5 pt-2 border-t border-border-subtle text-[10px] text-ink-tertiary leading-tight">
            Tasks can only be marked as Done once all upstream prerequisites are resolved.
          </p>
        </div>
      )}
    </div>
  );
}
