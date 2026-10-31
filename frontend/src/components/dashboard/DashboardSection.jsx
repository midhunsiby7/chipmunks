import React from 'react';

/**
 * Reusable Section Header & Container for Dashboard Panels
 *
 * @param {{
 *   title: string,
 *   description?: string,
 *   action?: React.ReactNode,
 *   children: React.ReactNode,
 *   className?: string
 * }} props
 */
export default function DashboardSection({
  title,
  description,
  action,
  children,
  className = '',
}) {
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
