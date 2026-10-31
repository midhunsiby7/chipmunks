import React from 'react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import DashboardEmptyState from './DashboardEmptyState';
import { Skeleton } from '../ui/LoadingIndicator';
import { BarChart3 } from 'lucide-react';

/**
 * Reusable Card Wrapper for Recharts Analytics Visualizations
 *
 * @param {{
 *   title: string,
 *   description?: string,
 *   action?: React.ReactNode,
 *   children?: React.ReactNode,
 *   isPendingApi?: boolean,
 *   pendingReason?: string,
 *   loading?: boolean,
 *   className?: string
 * }} props
 */
export default function DashboardChartCard({
  title,
  description,
  action,
  children,
  isPendingApi = false,
  pendingReason = 'Time-series aggregation API scheduled for Phase 7 analytics implementation.',
  loading = false,
  className = '',
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              {description}
            </CardDescription>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>

      <CardContent className="pt-6">
        {loading ? (
          <div className="h-72 w-full flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-xl" />
          </div>
        ) : isPendingApi ? (
          <DashboardEmptyState
            title="Analytics Aggregate Pending"
            description={pendingReason}
            icon={BarChart3}
            className="h-72"
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
