import React from 'react';
import { Layers } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Reusable Empty State for Dashboard Widgets
 *
 * @param {{
 *   title: string,
 *   description?: string,
 *   icon?: React.ComponentType<{ className?: string }>,
 *   actionLabel?: string,
 *   onAction?: () => void,
 *   className?: string
 * }} props
 */
export default function DashboardEmptyState({
  title,
  description,
  icon: Icon = Layers,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-50/50 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {description && (
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-2 text-xs">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
