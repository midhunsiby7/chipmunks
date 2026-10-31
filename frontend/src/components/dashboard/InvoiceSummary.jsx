import React from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Receipt, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/formatters';

/**
 * Reusable Invoice Status Summary Card
 *
 * @param {{
 *   paidCount?: number,
 *   pendingCount?: number,
 *   overdueCount?: number,
 *   paidAmount?: number,
 *   pendingAmount?: number,
 *   overdueAmount?: number,
 *   isPendingApi?: boolean,
 *   className?: string
 * }} props
 */
export default function InvoiceSummary({
  paidCount = 0,
  pendingCount = 0,
  overdueCount = 0,
  paidAmount = 0,
  pendingAmount = 0,
  overdueAmount = 0,
  isPendingApi = false,
  className = '',
}) {
  return (
    <Card className={className}>
      <CardHeader className="border-b border-slate-100 flex items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-indigo-600" />
          Invoice Status Summary
        </CardTitle>
        <span className="text-[11px] text-slate-400 font-medium">Billing Cycles</span>
      </CardHeader>

      <CardContent className="p-4">
        {isPendingApi ? (
          <div className="py-8 text-center space-y-1">
            <Clock className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Awaiting Invoicing Engine</p>
            <p className="text-[11px] text-slate-400">
              Recurring invoice generator scheduled for Phase 4 backend integration.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1">
              <div className="flex items-center justify-center text-emerald-600 mb-1">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Paid</span>
              <p className="text-base font-bold text-emerald-900">{formatNumber(paidCount)}</p>
              <p className="text-[10px] text-emerald-700">{formatCurrency(paidAmount)}</p>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl space-y-1">
              <div className="flex items-center justify-center text-amber-600 mb-1">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
              <p className="text-base font-bold text-amber-900">{formatNumber(pendingCount)}</p>
              <p className="text-[10px] text-amber-700">{formatCurrency(pendingAmount)}</p>
            </div>

            <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl space-y-1">
              <div className="flex items-center justify-center text-rose-600 mb-1">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Overdue</span>
              <p className="text-base font-bold text-rose-900">{formatNumber(overdueCount)}</p>
              <p className="text-[10px] text-rose-700">{formatCurrency(overdueAmount)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
