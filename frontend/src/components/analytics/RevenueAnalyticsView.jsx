import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  AlertCircle,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { formatCurrency } from '../../utils/formatters';

/**
 * Executive Revenue Performance & Multi-Currency Breakdown
 *
 * @param {{
 *   dashboardData: any,
 *   currencyBreakdown: {
 *     invoiced: Record<string, number>,
 *     collected: Record<string, number>,
 *     outstanding: Record<string, number>,
 *     overdue: Record<string, number>,
 *   },
 *   activeCurrency: string,
 * }} props
 */
export default function RevenueAnalyticsView({
  dashboardData,
  currencyBreakdown,
  activeCurrency,
}) {
  const mrr = Number(dashboardData?.mrr ?? 0);
  const arr = Number(dashboardData?.arr ?? 0);
  const totalRevenue = Number(dashboardData?.total_revenue ?? 0);
  const totalCollections = Number(dashboardData?.total_collections ?? 0);
  const outstandingAmount = Number(dashboardData?.outstanding_amount ?? 0);
  const overdueAmount = Number(dashboardData?.overdue_amount ?? 0);
  const overdueCount = Number(dashboardData?.overdue_invoices_count ?? 0);

  // Prepare chart series from backend revenue_trends
  const trendData = (dashboardData?.revenue_trends || []).map((pt) => ({
    name: pt.date_label,
    MRR: Number(pt.mrr ?? 0),
    Collections: Number(pt.collections ?? 0),
  }));

  // Identify all unique currencies present in the dataset
  const presentCurrencies = Array.from(
    new Set([
      ...Object.keys(currencyBreakdown.invoiced || {}),
      ...Object.keys(currencyBreakdown.collected || {}),
      ...Object.keys(currencyBreakdown.outstanding || {}),
      ...Object.keys(currencyBreakdown.overdue || {}),
    ])
  );

  return (
    <div className="space-y-6">
      {/* 4 Core Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR & ARR */}
        <Card className="border-l-4 border-l-indigo-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Monthly Recurring (MRR)
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(mrr, activeCurrency === 'all' ? 'INR' : activeCurrency)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">ARR:</span>
              <span>{formatCurrency(arr, activeCurrency === 'all' ? 'INR' : activeCurrency)}</span>
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium ml-auto">
                Contracted
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Invoiced Volume */}
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Invoiced
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalRevenue, activeCurrency === 'all' ? 'INR' : activeCurrency)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <span>Gross billings across non-cancelled invoices</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Collections (Settled) */}
        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Settled Collections
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 tracking-tight">
              {formatCurrency(totalCollections, activeCurrency === 'all' ? 'INR' : activeCurrency)}
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <span>Verified completed transaction volume</span>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Receivables */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Outstanding Balance
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(outstandingAmount, activeCurrency === 'all' ? 'INR' : activeCurrency)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Overdue: {formatCurrency(overdueAmount, activeCurrency === 'all' ? 'INR' : activeCurrency)}</span>
              {overdueCount > 0 && (
                <Badge variant="danger" size="sm">
                  {overdueCount} Past Due
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Visualizer */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Executive Revenue & Collections Velocity</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Time-series comparison of normalized Monthly Recurring Revenue (MRR) versus real cash collections
              </CardDescription>
            </div>
            <Badge variant="default" size="sm" className="hidden sm:inline-flex">
              Live PostgreSQL Aggregates
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {trendData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value, 'INR'), '']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="MRR"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMRR)"
                    name="Contracted MRR"
                  />
                  <Area
                    type="monotone"
                    dataKey="Collections"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorColl)"
                    name="Cash Collections"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <DollarSign className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs font-medium">No time-series points recorded for this reporting period.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Currency Segregation Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Multi-Currency Reconciliation Ledger</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Financial performance segregated strictly by billing currency to prevent cross-currency summation errors
              </CardDescription>
            </div>
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Isolated Balances
            </span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Currency</th>
                <th className="py-2.5 px-4 text-right">Invoiced Volume</th>
                <th className="py-2.5 px-4 text-right">Collected Volume</th>
                <th className="py-2.5 px-4 text-right">Outstanding Due</th>
                <th className="py-2.5 px-4 text-right">Overdue Balance</th>
                <th className="py-2.5 px-4 text-center">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {presentCurrencies.length > 0 ? (
                presentCurrencies.map((curr) => {
                  const inv = currencyBreakdown.invoiced[curr] || 0;
                  const coll = currencyBreakdown.collected[curr] || 0;
                  const out = currencyBreakdown.outstanding[curr] || 0;
                  const over = currencyBreakdown.overdue[curr] || 0;
                  const rate = inv > 0 ? Math.min(100, Math.round((coll / inv) * 100)) : 100;

                  return (
                    <tr key={curr} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] text-slate-700 font-mono">
                          {curr}
                        </span>
                        <span>{curr === 'INR' ? 'Indian Rupee' : curr === 'USD' ? 'US Dollar' : curr === 'EUR' ? 'Euro' : 'British Pound'}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {formatCurrency(inv, curr)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {formatCurrency(coll, curr)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-600">
                        {formatCurrency(out, curr)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600">
                        {formatCurrency(over, curr)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rate >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rate >= 50
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                    No currency records available for this reporting window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
