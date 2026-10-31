import React from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Repeat, Clock } from 'lucide-react';
import { formatNumber } from '../../utils/formatters';

/**
 * Reusable Subscription Status Summary
 *
 * @param {{
 *   activeCount?: number,
 *   trialingCount?: number,
 *   pausedCount?: number,
 *   cancelledCount?: number,
 *   isPendingApi?: boolean,
 *   className?: string
 * }} props
 */
export default function SubscriptionSummary({
  activeCount = 0,
  trialingCount = 0,
  pausedCount = 0,
  cancelledCount = 0,
  isPendingApi = false,
  className = '',
}) {
  const items = [
    { label: 'Active', count: activeCount, color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    { label: 'Trialing', count: trialingCount, color: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50' },
    { label: 'Paused', count: pausedCount, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'Cancelled', count: cancelledCount, color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' },
  ];

  return (
    <Card className={className}>
      <CardHeader className="border-b border-slate-100 flex items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Repeat className="w-4 h-4 text-indigo-600" />
          Subscription Status Breakdown
        </CardTitle>
        <span className="text-[11px] text-slate-400 font-medium">Cadence Lifecycle</span>
      </CardHeader>

      <CardContent className="p-4">
        {isPendingApi ? (
          <div className="py-8 text-center space-y-1">
            <Clock className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Awaiting Subscription Engine</p>
            <p className="text-[11px] text-slate-400">
              State transitions scheduled for Phase 4 backend integration.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.label} className={`p-3 rounded-xl border border-slate-100 ${item.bg} text-center space-y-1`}>
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${item.text}`}>
                    {item.label}
                  </span>
                </div>
                <p className="text-lg font-bold text-slate-900">{formatNumber(item.count)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
