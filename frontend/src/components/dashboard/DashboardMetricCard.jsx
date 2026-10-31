import React from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Skeleton } from '../ui/LoadingIndicator';

/**
 * Reusable Metric KPI Card for Brightloop Dashboards
 *
 * @param {{
 *   title: string,
 *   value: string|number|null,
 *   icon?: React.ComponentType<{ className?: string }>,
 *   change?: string,
 *   changeType?: 'positive'|'negative'|'neutral',
 *   caption?: string,
 *   badgeLabel?: string,
 *   isPendingApi?: boolean,
 *   loading?: boolean,
 *   className?: string
 * }} props
 */
export default function DashboardMetricCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = 'neutral',
  caption,
  badgeLabel,
  isPendingApi = false,
  loading = false,
  className = '',
}) {
  if (loading) {
    return (
      <Card className={`p-5 space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-3 w-20" />
      </Card>
    );
  }

  const changeColors = {
    positive: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    negative: 'text-rose-700 bg-rose-50 border-rose-200',
    neutral: 'text-slate-600 bg-slate-100 border-slate-200',
  };

  const ChangeIcon = changeType === 'positive' ? TrendingUp : changeType === 'negative' ? TrendingDown : null;

  return (
    <Card className={`p-5 transition-shadow hover:shadow-md ${className}`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3">
        {isPendingApi || value === null || value === undefined ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="text-lg font-semibold text-slate-400">Awaiting API</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {caption || 'Planned for upcoming billing/analytics phase'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {value}
            </div>
            {(change || caption || badgeLabel) && (
              <div className="flex items-center flex-wrap gap-2 pt-1 text-xs">
                {change && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium border text-[11px] ${changeColors[changeType]}`}
                  >
                    {ChangeIcon && <ChangeIcon className="w-3 h-3" />}
                    {change}
                  </span>
                )}
                {badgeLabel && (
                  <Badge variant="primary" size="sm" className="text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {badgeLabel}
                  </Badge>
                )}
                {caption && !change && (
                  <span className="text-slate-500 text-xs">{caption}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
