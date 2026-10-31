import React from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { CreditCard } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate, getStatusVariant } from '../../utils/formatters';

/**
 * Reusable Payments Table for Dashboards
 *
 * @param {{
 *   payments?: Array<{
 *     id: string,
 *     transactionId?: string,
 *     customerName?: string,
 *     amount: number,
 *     currency?: string,
 *     status: string,
 *     method?: string,
 *     date: string
 *   }>,
 *   title?: string,
 *   className?: string
 * }} props
 */
export default function RecentPaymentsTable({
  payments = [],
  title = 'Recent Payment Transactions',
  className = '',
}) {
  return (
    <Card className={className}>
      <CardHeader className="border-b border-slate-100 flex items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-600" />
          {title}
        </CardTitle>
        <span className="text-[11px] text-slate-400 font-medium">Reconciliation</span>
      </CardHeader>

      <CardContent className="p-0">
        {!payments || payments.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Payment Records Found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live transaction logs will stream here upon Phase 6/10 Razorpay integration.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-slate-700">
                    {p.transactionId || p.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {p.customerName || 'Customer'}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {formatCurrency(p.amount, p.currency || 'INR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(p.status)} size="sm">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(p.date)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
