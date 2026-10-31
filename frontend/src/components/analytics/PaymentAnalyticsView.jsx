import React from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  Building,
  ArrowUpRight,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { getPaymentStatusBadge, getPaymentMethodBadge } from '../../utils/paymentValidation';

/**
 * Payment & Gateway Analytics View
 *
 * @param {{
 *   payments: Array<any>,
 *   paymentBreakdown: {
 *     totalCompletedVolumeByCurrency: Record<string, number>,
 *     totalCompletedCount: number,
 *     methodBreakdown: Array<{ method: string, count: number, volumeByCurrency: Record<string, number>, isOnline: boolean }>,
 *     onlineCount: number,
 *     offlineCount: number,
 *   },
 *   currency: string,
 * }} props
 */
export default function PaymentAnalyticsView({
  payments,
  paymentBreakdown,
  currency,
}) {
  const displayCurrency = currency === 'all' ? 'INR' : currency;
  const completedCount = paymentBreakdown.totalCompletedCount;
  const onlineCount = paymentBreakdown.onlineCount;
  const offlineCount = paymentBreakdown.offlineCount;

  const onlinePct = completedCount > 0 ? Math.round((onlineCount / completedCount) * 100) : 0;
  const offlinePct = completedCount > 0 ? Math.round((offlineCount / completedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Settled Payment Volume
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {Object.keys(paymentBreakdown.totalCompletedVolumeByCurrency).length > 0 ? (
                Object.keys(paymentBreakdown.totalCompletedVolumeByCurrency).map((curr) => (
                  <div key={curr}>
                    {formatCurrency(paymentBreakdown.totalCompletedVolumeByCurrency[curr], curr)}
                  </div>
                ))
              ) : (
                <div>₹0.00</div>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {formatNumber(completedCount)} completed settlements
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Razorpay Online Capture
              </span>
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {formatNumber(onlineCount)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{onlinePct}% of total volume</span>
              <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-bold">
                Automated
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Manual / Bank Wire
              </span>
              <Building className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {formatNumber(offlineCount)}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{offlinePct}% of total volume</span>
              <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-bold">
                Reconciled
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Distribution */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Payment Channel & Method Distribution</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Breakdown of settled payments by transaction gateway and offline channels
            </CardDescription>
          </div>
          <Link
            to="/payments"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
          >
            Payments Ledger
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Payment Method</th>
                <th className="py-2.5 px-4 text-center">Channel</th>
                <th className="py-2.5 px-4 text-center">Transactions</th>
                <th className="py-2.5 px-4 text-right">Settled Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paymentBreakdown.methodBreakdown.length > 0 ? (
                paymentBreakdown.methodBreakdown.map((item) => {
                  const badge = getPaymentMethodBadge(item.method);
                  const currencies = Object.keys(item.volumeByCurrency);
                  return (
                    <tr key={item.method} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        <Badge variant={badge.variant} size="sm">
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.isOnline
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.isOnline ? 'Online Gateway' : 'Offline Direct'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-800">
                        {formatNumber(item.count)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {currencies.map((curr) => (
                          <div key={curr}>
                            {formatCurrency(item.volumeByCurrency[curr], curr)}
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-xs text-slate-400">
                    No completed payments recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Payments Stream */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Recent Payment Ledger Entries</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Latest successful customer settlements
            </CardDescription>
          </div>
          <Link
            to="/payments"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
          >
            All Payments
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Payment Ref</th>
                <th className="py-2.5 px-4">Invoice</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Method</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Settled Amount</th>
                <th className="py-2.5 px-4 text-right">Paid Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.slice(0, 5).map((pay) => {
                const statusBadge = getPaymentStatusBadge(pay.status);
                const methodBadge = getPaymentMethodBadge(pay.payment_method);
                return (
                  <tr key={pay.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-indigo-600">
                      <Link to={`/payments?id=${pay.id}`} className="hover:underline">
                        {pay.payment_reference || pay.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {pay.invoice?.invoice_number || 'INV-2026'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {pay.customer?.full_name || pay.customer_name || 'Customer'}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant={methodBadge.variant} size="sm">
                        {methodBadge.label}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant={statusBadge.variant} size="sm">
                        {statusBadge.label}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(pay.amount, pay.currency || displayCurrency)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {formatDate(pay.paid_at || pay.created_at)}
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
