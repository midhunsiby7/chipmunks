import React from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Activity, Clock } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

/**
 * Reusable Activity List Component
 *
 * @param {{
 *   activities?: Array<{
 *     id: string,
 *     user?: string,
 *     action: string,
 *     target?: string,
 *     timestamp: string|Date,
 *     type?: 'info'|'success'|'warning'
 *   }>,
 *   title?: string,
 *   className?: string
 * }} props
 */
export default function RecentActivityList({
  activities = [],
  title = 'Recent Activity Log',
  className = '',
}) {
  return (
    <Card className={className}>
      <CardHeader className="border-b border-slate-100 flex items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          {title}
        </CardTitle>
        <span className="text-[11px] text-slate-400 font-medium">Audit Trail</span>
      </CardHeader>

      <CardContent className="p-0">
        {!activities || activities.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Recent Events</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Customer registrations and staff provisioning will log here in real time.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activities.map((item) => (
              <li key={item.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {item.action}
                    </p>
                    {item.user && (
                      <p className="text-[11px] text-slate-500">By {item.user}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
