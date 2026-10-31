import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  Users,
  ArrowUpRight,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';

/**
 * Invoice Aging Schedule & Receivables Risk Report
 *
 * @param {{
 *   invoices: Array<any>,
 *   agingSchedule: {
 *     totalOverdueCount: number,
 *     buckets: Array<{
 *       id: string,
 *       label: string,
 *       count: number,
 *       byCurrency: Record<string, number>,
 *     }>,
 *   },
 *   currency: string,
 * }} props
 */
export default function InvoiceAgingReportView({
  invoices,
  agingSchedule,
  currency,
}) {
  const displayCurrency = currency === 'all' ? 'INR' : currency;

  // Extract top customer balances with outstanding due
  const customerBalanceMap = {};
  invoices.forEach((inv) => {
    const status = (inv.status || '').toLowerCase();
    if (['paid', 'cancelled', 'void'].includes(status)) return;

    const due = Number(inv.amount_due ?? 0);
    if (due <= 0) return;

    const custId = inv.customer_id || inv.customer?.id || 'unknown';
    const custName = inv.customer?.full_name || inv.customer?.email || 'Unknown Customer';
    const curr = (inv.currency || displayCurrency).toUpperCase();

    if (!customerBalanceMap[custId]) {
      customerBalanceMap[custId] = {
        customerId: custId,
        customerName: custName,
        customerEmail: inv.customer?.email || '',
        unpaidCount: 0,
        dueByCurrency: {},
      };
    }

    customerBalanceMap[custId].unpaidCount += 1;
    customerBalanceMap[custId].dueByCurrency[curr] =
      Math.round(((customerBalanceMap[custId].dueByCurrency[curr] || 0) + due) * 100) / 100;
  });

  const topDebtors = Object.values(customerBalanceMap)
    .sort((a, b) => {
      const aVal = Object.values(a.dueByCurrency)[0] || 0;
      const bVal = Object.values(b.dueByCurrency)[0] || 0;
      return bVal - aVal;
    })
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 5-Tier Overdue Aging Schedule */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Receivables Aging Schedule (Past Due Analysis)</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Unpaid and partially paid invoices stratified by days elapsed since payment due date
            </CardDescription>
          </div>
          {agingSchedule.totalOverdueCount > 0 ? (
            <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              {agingSchedule.totalOverdueCount} Invoices Overdue
            </span>
          ) : (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              Zero Overdue Invoices
            </span>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {agingSchedule.buckets.map((bucket) => {
              const currencies = Object.keys(bucket.byCurrency);
              const isPastDue = bucket.id !== 'current';
              const isHighRisk = bucket.id === 'days_61_90' || bucket.id === 'days_90_plus';

              return (
                <div
                  key={bucket.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    isHighRisk && bucket.count > 0
                      ? 'bg-rose-50/70 border-rose-200'
                      : isPastDue && bucket.count > 0
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-bold text-slate-800">{bucket.label}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          bucket.count > 0
                            ? isHighRisk
                              ? 'bg-rose-200 text-rose-800'
                              : isPastDue
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {bucket.count} inv
                      </span>
                    </div>

                    <div className="space-y-1 mt-2">
                      {currencies.length > 0 ? (
                        currencies.map((curr) => (
                          <div
                            key={curr}
                            className={`text-sm font-black tracking-tight ${
                              isHighRisk
                                ? 'text-rose-900'
                                : isPastDue
                                ? 'text-amber-900'
                                : 'text-slate-900'
                            }`}
                          >
                            {formatCurrency(bucket.byCurrency[curr], curr)}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm font-bold text-slate-400">₹0.00</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                    {bucket.id === 'current'
                      ? 'Within contract grace period'
                      : isHighRisk
                      ? 'High default risk'
                      : 'Past grace period'}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Customer Outstanding Balances */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Receivables Exposure by Customer Account</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Customer accounts holding positive outstanding invoice balances
            </CardDescription>
          </div>
          <Link
            to="/invoices"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
          >
            Invoices Directory
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Customer Account</th>
                <th className="py-2.5 px-4 text-center">Unsettled Invoices</th>
                <th className="py-2.5 px-4 text-right">Outstanding Balance</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topDebtors.length > 0 ? (
                topDebtors.map((debtor) => {
                  const currList = Object.keys(debtor.dueByCurrency);
                  return (
                    <tr key={debtor.customerId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{debtor.customerName}</div>
                        {debtor.customerEmail && (
                          <div className="text-[11px] text-slate-400 font-normal">
                            {debtor.customerEmail}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                          {debtor.unpaidCount} unpaid
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {currList.map((curr) => (
                          <div key={curr} className="font-bold text-rose-600">
                            {formatCurrency(debtor.dueByCurrency[curr], curr)}
                          </div>
                        ))}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/invoices?customer_id=${debtor.customerId}`}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <span>Inspect Invoices</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                    All customer accounts are fully settled. Zero outstanding exposure!
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
