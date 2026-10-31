import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  badge,
  className = '',
}) {
  return (
    <div className={`space-y-2 pb-6 border-b border-slate-200 ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-500 gap-1.5 mb-1">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {crumb.href && !isLast ? (
                  <Link to={crumb.href} className="hover:text-slate-900 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'font-medium text-slate-800' : ''}>{crumb.label}</span>
                )}
                {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Main Title and Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && <p className="text-sm text-slate-500 max-w-3xl">{description}</p>}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
