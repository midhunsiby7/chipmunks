import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  getInvoiceStatusBadge,
  isInvoiceOverdue,
  canCancelInvoice,
} from '../../utils/invoiceValidation';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import {
  Receipt,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';

export default function InvoiceDetailsModal({
  isOpen,
  onClose,
  invoice,
  customerName = null,
  subscriptionCode = null,
  onCancelClick = null,
}) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const statusBadge = getInvoiceStatusBadge(invoice.status);
  const isOverdue = isInvoiceOverdue(invoice.due_date, invoice.amount_due);
  const eligibleForCancel = canCancelInvoice(invoice, user?.role);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(invoice.invoice_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintDocument = () => {
    // Open backend rendered printable HTML document with CSS print styling
    window.open(`/api/v1/invoices/${invoice.id}/html`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-lg font-bold text-slate-900 tracking-wider">
              {invoice.invoice_number}
            </span>
            <span className="block text-xs font-normal text-slate-500">
              Tax Invoice Specification & Financial Settlement
            </span>
          </div>
        </div>
      }
      size="xl"
    >
      <div className="space-y-6">
        {/* TOP STATUS BAR & ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-purple-50/50 rounded-xl border border-indigo-100">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Grand Total
            </span>
            <div className="text-2xl font-black text-indigo-700 flex items-center gap-2 mt-0.5">
              {formatCurrency(invoice.total_amount, invoice.currency)}
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {invoice.currency || 'USD'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Copy invoice number"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Number</span>
                </>
              )}
            </button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrintDocument}
              className="flex items-center space-x-1.5 text-xs text-slate-700 hover:text-indigo-600"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF Document</span>
            </Button>

            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                statusBadge.color === 'emerald'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : statusBadge.color === 'amber'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : statusBadge.color === 'red'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : statusBadge.color === 'blue'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {statusBadge.dot && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    statusBadge.color === 'emerald'
                      ? 'bg-emerald-500'
                      : statusBadge.color === 'amber'
                      ? 'bg-amber-500'
                      : statusBadge.color === 'red'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                />
              )}
              <span>{statusBadge.label}</span>
            </span>
          </div>
        </div>

        {/* OVERDUE NOTICE */}
        {isOverdue && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-800 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <div>
              <span className="font-bold">Payment Overdue:</span> This invoice passed its payment due date on {formatDate(invoice.due_date)} with an outstanding balance of {formatCurrency(invoice.amount_due, invoice.currency)}.
            </div>
          </div>
        )}

        {/* METRICS & REFERENCES GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Billed To
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">
              {customerName || 'Subscriber Account'}
            </div>
            <span className="text-[11px] text-slate-400 font-mono truncate block mt-0.5">
              ID: {invoice.customer_id ? `${invoice.customer_id.slice(0, 8)}...` : '—'}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Issue & Due Dates
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {formatDate(invoice.issue_date)}
            </div>
            <span className={`text-[11px] block mt-0.5 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
              Due: {formatDate(invoice.due_date)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Billing Period
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {invoice.billing_period_start && invoice.billing_period_end ? (
                `${formatDate(invoice.billing_period_start)} – ${formatDate(invoice.billing_period_end)}`
              ) : (
                'Standard Invoicing'
              )}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Subscription: {subscriptionCode || (invoice.subscription_id ? `${invoice.subscription_id.slice(0, 8)}...` : 'Manual')}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Outstanding Balance
            </span>
            <div className={`text-base font-bold mt-1 ${Number(invoice.amount_due) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatCurrency(invoice.amount_due, invoice.currency)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Paid: {formatCurrency(invoice.amount_paid, invoice.currency)}
            </span>
          </div>
        </div>

        {/* ITEMIZED INVOICE LINES TABLE */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Itemized Bill of Charges</h4>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.lines && invoice.lines.length > 0 ? (
                  invoice.lines.map((line, idx) => (
                    <tr key={line.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{line.description}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{line.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(line.unit_price, invoice.currency)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(line.line_total, invoice.currency)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                      Invoice total: {formatCurrency(invoice.total_amount, invoice.currency)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FINANCIAL TOTALS BREAKDOWN */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Applied:</span>
                  <span className="font-semibold">-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                </div>
              )}
              {Number(invoice.tax_amount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax Assessment:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-indigo-600">{formatCurrency(invoice.total_amount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600 pt-1">
                <span>Amount Paid:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-100">
                <span className="text-slate-700">Outstanding Balance:</span>
                <span className={Number(invoice.amount_due) > 0 ? 'text-red-600' : 'text-slate-800'}>
                  {formatCurrency(invoice.amount_due, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* INVOICE NOTES */}
        {invoice.notes && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Invoice Memo & Notes:
            </span>
            <p className="text-slate-600 whitespace-pre-line pl-5">{invoice.notes}</p>
          </div>
        )}

        {/* MODAL ACTIONS TOOLBAR */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {eligibleForCancel && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onCancelClick?.(invoice);
                }}
                className="flex items-center space-x-1.5 text-xs text-red-600 hover:bg-red-50 border-red-200"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Invoice</span>
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              onClick={handlePrintDocument}
              className="flex items-center space-x-1.5 text-xs text-indigo-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Print View</span>
            </Button>

            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
