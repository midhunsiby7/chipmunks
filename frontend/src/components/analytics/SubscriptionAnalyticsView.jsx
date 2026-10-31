import React from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat,
  Layers,
  Calendar,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { getSubscriptionStatusBadge } from '../../utils/subscriptionValidation';

/**
 * Subscription Lifecycle Analytics & Plan Popularity Breakdown
 *
 * @param {{
 *   subscriptions: Array<any>,
 *   distribution: {
 *     total: number,
 *     byStatus: Record<string, number>,
 *     byCadence: Record<string, number>,
 *   },
 *   popularPlans: Array<{ planId: string, planName: string, activeCount: number, mrrContribution: number }>,
 *   currency: string,
 * }} props
 */
export default function SubscriptionAnalyticsView({
  subscriptions,
  distribution,
  popularPlans,
  currency,
}) {
  const total = distribution.total || subscriptions.length || 0;
  const activeCount = distribution.byStatus.active || 0;
  const pausedCount = distribution.byStatus.paused || 0;
  const closedCount = (distribution.byStatus.closed || 0) + (distribution.byStatus.cancelled || 0);
  const trialingCount = distribution.byStatus.trialing || 0;

  const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;
  const pausedPct = total > 0 ? Math.round((pausedCount / total) * 100) : 0;
  const closedPct = total > 0 ? Math.round((closedCount / total) * 100) : 0;

  const displayCurrency = currency === 'all' ? 'INR' : currency;

  return (
    <div className="space-y-6">
      {/* Status Breakdown Bar & Cards */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-indigo-600" />
                <span>Subscription Lifecycle Distribution</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Current operational status split across {formatNumber(total)} contracted subscriptions
              </CardDescription>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              {formatNumber(total)} Total Contracts
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Visual Horizontal Segmented Distribution Bar */}
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {activePct > 0 && (
              <div
                style={{ width: `${activePct}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Active: ${activePct}%`}
              />
            )}
            {pausedPct > 0 && (
              <div
                style={{ width: `${pausedPct}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`Paused: ${pausedPct}%`}
              />
            )}
            {closedPct > 0 && (
              <div
                style={{ width: `${closedPct}%` }}
                className="bg-slate-400 h-full transition-all"
                title={`Closed/Cancelled: ${closedPct}%`}
              />
            )}
          </div>

          {/* Metric Pills Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-lg font-bold text-emerald-900 leading-tight">
                  {formatNumber(activeCount)}
                </div>
                <div className="text-[11px] text-emerald-700">Active ({activePct}%)</div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center gap-2.5">
              <PauseCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="text-lg font-bold text-amber-900 leading-tight">
                  {formatNumber(pausedCount)}
                </div>
                <div className="text-[11px] text-amber-700">Paused ({pausedPct}%)</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5">
              <XCircle className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <div className="text-lg font-bold text-slate-900 leading-tight">
                  {formatNumber(closedCount)}
                </div>
                <div className="text-[11px] text-slate-600">Closed / Cancelled ({closedPct}%)</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <div className="text-lg font-bold text-blue-900 leading-tight">
                  {formatNumber(trialingCount)}
                </div>
                <div className="text-[11px] text-blue-700">Trialing</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cadence Split & Popular Plans Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Billing Cadence Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Billing Intervals</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Contract cadence preference
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="font-medium text-slate-700">Monthly Billing</span>
              <span className="font-bold text-slate-900">
                {formatNumber(distribution.byCadence.monthly || 0)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="font-medium text-slate-700">Yearly / Annual</span>
              <span className="font-bold text-slate-900">
                {formatNumber(distribution.byCadence.yearly || 0)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="font-medium text-slate-700">Weekly Billing</span>
              <span className="font-bold text-slate-900">
                {formatNumber(distribution.byCadence.weekly || 0)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="font-medium text-slate-700">Daily Billing</span>
              <span className="font-bold text-slate-900">
                {formatNumber(distribution.byCadence.daily || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Popular Plans Ranking */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Subscription Plan Performance</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Active subscriber volume and estimated Monthly Recurring Revenue contribution
              </CardDescription>
            </div>
            <Link
              to="/plans"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              Plans Catalog
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Plan Name</th>
                  <th className="py-2.5 px-4 text-center">Active Subscribers</th>
                  <th className="py-2.5 px-4 text-right">Est. Monthly Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {popularPlans.length > 0 ? (
                  popularPlans.slice(0, 6).map((plan) => (
                    <tr key={plan.planId} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {plan.planName}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                          {formatNumber(plan.activeCount)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                        {formatCurrency(plan.mrrContribution, displayCurrency)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-xs text-slate-400">
                      No active plan subscriptions detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Recent Subscriptions Ledger */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Recent Subscription Activity</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Latest contract provisioning events
            </CardDescription>
          </div>
          <Link
            to="/subscriptions"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
          >
            View All Subscriptions
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Code</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Plan</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Contract Value</th>
                <th className="py-2.5 px-4 text-right">Provisioned Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.slice(0, 5).map((sub) => {
                const badge = getSubscriptionStatusBadge(sub.status);
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-indigo-600">
                      <Link to={`/subscriptions?id=${sub.id}`} className="hover:underline">
                        {sub.subscription_code || sub.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {sub.customer?.full_name || sub.customer_name || 'Customer'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {sub.plan?.name || sub.plan_name || 'Custom Plan'}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant={badge.variant} size="sm">
                        {badge.label}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(sub.total_amount, sub.currency || displayCurrency)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {formatDate(sub.created_at || sub.start_date)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
