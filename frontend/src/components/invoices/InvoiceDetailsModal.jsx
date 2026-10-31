import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  getInvoiceStatusBadge,
  isInvoiceOverdue,
  canCancelInvoice,
} from '../../utils/invoiceValidation';
import {
  canPayOnline,
  canRecordManualPayment,
  getPaymentStatusBadge,
  getPaymentMethodBadge,
} from '../../utils/paymentValidation';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import { paymentService } from '../../services/paymentService';
import PaymentRecordModal from '../payments/PaymentRecordModal';
import RazorpayCheckoutModal from '../payments/RazorpayCheckoutModal';
import {
  Receipt,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  FileText,
  ExternalLink,
  CreditCard,
  Zap,
} from 'lucide-react';

export default function InvoiceDetailsModal({
  isOpen,
  onClose,
  invoice,
  customerName = null,
  subscriptionCode = null,
  onCancelClick = null,
  onInvoiceUpdated = null,
}) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsRefresh, setPaymentsRefresh] = useState(0);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice?.id) return;

    let isMounted = true;
    paymentService
      .listPayments({ invoiceId: invoice.id, pageSize: 20 })
      .then((res) => {
        if (isMounted) {
          setPayments(res.items || []);
          setLoadingPayments(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Could not load payments for invoice:', err);
          setLoadingPayments(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice?.id, paymentsRefresh]);

  if (!invoice) return null;

  const statusBadge = getInvoiceStatusBadge(invoice.status);
  const isOverdue = isInvoiceOverdue(invoice.due_date, invoice.amount_due);
  const eligibleForCancel = canCancelInvoice(invoice, user?.role);
  const eligibleForOnlinePay = canPayOnline(invoice, user);
  const eligibleForManualPay = canRecordManualPayment(user?.role) && Number(invoice.amount_due) > 0 && !['paid', 'cancelled', 'void'].includes((invoice.status || '').toLowerCase());

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(invoice.invoice_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintDocument = () => {
    window.open(`/api/v1/invoices/${invoice.id}/html`, '_blank');
  };

  const handlePaymentSuccess = () => {
    setLoadingPayments(true);
    setPaymentsRefresh((c) => c + 1);
    onInvoiceUpdated?.();
  };

  return (
    <>
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

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Pay Online Button */}
              {eligibleForOnlinePay && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsRazorpayModalOpen(true)}
                  className="flex items-center space-x-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Pay Online (Razorpay)</span>
                </Button>
              )}

              {/* Record Manual Payment Button */}
              {eligibleForManualPay && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsRecordModalOpen(true)}
                  className="flex items-center space-x-1.5 text-xs text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Record Payment</span>
                </Button>
              )}

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
                <span>Print Document</span>
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

          {/* PAYMENT HISTORY & RECONCILIATION */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-800">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Payment History & Settlement Records
                </h4>
              </div>
              <span className="text-xs text-slate-500">
                {payments.length} {payments.length === 1 ? 'payment' : 'payments'} recorded
              </span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPayments ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                        Loading payment history...
                      </td>
                    </tr>
                  ) : payments.length > 0 ? (
                    payments.map((p) => {
                      const pStatus = getPaymentStatusBadge(p.status);
                      const pMethod = getPaymentMethodBadge(p.payment_method);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {p.payment_reference}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {formatDateTime(p.paid_at || p.created_at)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center space-x-1">
                              {pMethod.isOnline ? (
                                <Zap className="w-3 h-3 text-indigo-600 mr-1" />
                              ) : null}
                              <span>{pMethod.label}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(p.amount, p.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                pStatus.variant === 'success'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : pStatus.variant === 'warning'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {pStatus.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                        No payments recorded yet for this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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

      {/* RAZORPAY ONLINE CHECKOUT MODAL */}
      {isRazorpayModalOpen && (
        <RazorpayCheckoutModal
          isOpen={isRazorpayModalOpen}
          onClose={() => setIsRazorpayModalOpen(false)}
          invoice={invoice}
          customerName={customerName}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* MANUAL PAYMENT RECORD MODAL */}
      {isRecordModalOpen && (
        <PaymentRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          preselectedInvoice={invoice}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
