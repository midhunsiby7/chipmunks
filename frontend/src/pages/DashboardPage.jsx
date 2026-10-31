import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, Users, RefreshCw, AlertCircle } from 'lucide-react';
import MetricCard from '../components/MetricCard';

const SAMPLE_REVENUE_DATA = [
  { month: 'May', mrr: 12400 },
  { month: 'Jun', mrr: 14200 },
  { month: 'Jul', mrr: 18900 },
  { month: 'Aug', mrr: 23400 },
  { month: 'Sep', mrr: 28100 },
  { month: 'Oct', mrr: 34500 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Subscription Management Overview
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Real-time metrics for recurring revenue, active subscriptions, and invoice reconciliation.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Monthly Recurring Revenue"
          value="$34,500"
          change="+22.8%"
          changeType="positive"
          icon={DollarSign}
        />
        <MetricCard
          title="Active Subscriptions"
          value="1,420"
          change="+8.4%"
          changeType="positive"
          icon={Users}
        />
        <MetricCard
          title="Renewal Rate"
          value="96.2%"
          change="+1.1%"
          changeType="positive"
          icon={RefreshCw}
        />
        <MetricCard
          title="Pending Invoices"
          value="18"
          change="3 overdue"
          changeType="negative"
          icon={AlertCircle}
        />
      </div>

      {/* Analytics Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">MRR Growth Trajectory</h3>
            <p className="text-xs text-slate-500">6-month recurring revenue trend</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md">
            USD Currency
          </span>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={SAMPLE_REVENUE_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString()}`, 'MRR']}
                contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
              />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="#4f46e5"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMrr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">
              Phase 1 Project Initialization Active
            </h3>
            <div className="mt-2 text-sm text-amber-700">
              <p>
                Core application routes, backend models, schemas, and PostgreSQL migration scaffolds have been initialized. Real database records will populate these cards once Developer 2 and Developer 1 implement the authentication and CRUD endpoints according to <code>PROJECT_CONTEXT.md</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
