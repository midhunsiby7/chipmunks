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
import { DollarSign, Users, RefreshCw, AlertCircle, Info } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

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
      <PageHeader
        title="Subscription Management Overview"
        description="Real-time metrics for recurring revenue, active subscriptions, and invoice reconciliation."
        breadcrumbs={[{ label: 'Brightloop', href: '/' }, { label: 'Overview' }]}
        badge={
          <Badge variant="primary" size="sm" dot>
            Phase 1 Foundation
          </Badge>
        }
      />

      {/* Development Transparency Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-2xs">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">
            Phase 1 Frontend Architecture & Component Foundation Active
          </p>
          <p className="text-amber-800 leading-relaxed">
            The shell, reusable UI component suite, Firebase SDK configuration, and centralized API client are fully established. Metrics cards and chart trends below demonstrate layout rendering and will be connected to Developer 1's live analytics aggregates in Phase 7.
          </p>
        </div>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>MRR Growth Trajectory</CardTitle>
            <CardDescription>6-month recurring revenue trend demonstration</CardDescription>
          </div>
          <Badge variant="default" size="sm">
            USD Currency
          </Badge>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
