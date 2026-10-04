import React from 'react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="py-14 text-center border border-dashed border-[#E5E7EB] rounded-lg bg-[#FAFAFA]/50 my-2">
      <h3 className="text-xs font-semibold text-gray-800">{title}</h3>
      <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-normal">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-black transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
