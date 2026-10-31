import React from 'react';
import Card from '../ui/Card';
import { Skeleton } from '../ui/LoadingIndicator';

/**
 * Reusable Loading Skeleton for Full Dashboard View
 */
export default function DashboardLoadingState() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>

      {/* Chart Section Skeleton */}
      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-7 w-28 rounded-md" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </Card>
    </div>
  );
}
