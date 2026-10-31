import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  getPaymentStatusBadge,
  getPaymentMethodBadge,
  PAYMENT_METHODS,
} from '../../utils/paymentValidation';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  CreditCard,
  Copy,
  Check,
  Zap,
  Building,
  User,
  Receipt,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PaymentDetailsModal({
  isOpen,
  onClose,
  payment,
  customerName = null,
  customerEmail = null,
  invoiceNumber = null,
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!payment) return null;

  const statusBadge = getPaymentStatusBadge(payment.status);
  const methodBadge = getPaymentMethodBadge(payment.payment_method);
  const isRazorpay = payment.payment_method === PAYMENT_METHODS.RAZORPAY;

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigateInvoice = () => {
    onClose();
    navigate(`/invoices?id=${payment.invoice_id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-lg font-bold text-slate-900 tracking-wider">
              {payment.payment_reference}
            </span>
            <p className="text-xs text-slate-500 font-normal">
              Transaction Details & Reconciliation Record
            </p>
          </div>
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* TOP BANNER: Status & Quick Copy */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center space-x-2.5">
            <span
              className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${
                statusBadge.variant === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : statusBadge.variant === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : statusBadge.variant === 'danger'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {statusBadge.dot && (
                <span
                  className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
                    statusBadge.variant === 'success'
                      ? 'bg-emerald-500'
                      : statusBadge.variant === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                />
              )}
              {statusBadge.label}
            </span>

            {isRazorpay ? (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Zap className="w-3 h-3 mr-1 text-indigo-600" />
                Razorpay Online
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <Building className="w-3 h-3 mr-1 text-slate-500" />
                Offline / Manual
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleCopy(payment.payment_reference)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied Reference</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Reference</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FINANCIAL HERO: Amount & Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 rounded-xl border border-indigo-100 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Amount Transacted
            </p>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {formatCurrency(payment.amount, payment.currency)}
            </div>
            <p className="text-xs text-slate-500">
              Currency: {payment.currency || 'USD'}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Payment Method
            </p>
            <div className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
              <span>{methodBadge.label}</span>
            </div>
            <p className="text-xs text-slate-500">
              Recorded at: {formatDateTime(payment.paid_at || payment.created_at)}
            </p>
          </div>
        </div>

        {/* ASSOCIATED ENTITIES: Customer & Invoice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Customer Account</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {customerName || 'Customer Record'}
              </p>
              {customerEmail && (
                <p className="text-xs text-slate-500">{customerEmail}</p>
              )}
              <p className="font-mono text-xs text-slate-400 mt-1">
                ID: {payment.customer_id}
              </p>
            </div>
          </div>

          {/* Invoice Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                <Receipt className="w-4 h-4 text-indigo-600" />
                <span>Target Invoice</span>
              </div>
              <button
                type="button"
                onClick={handleNavigateInvoice}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center space-x-1"
              >
                <span>Inspect Invoice</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {invoiceNumber || 'Linked Invoice'}
              </p>
              <p className="font-mono text-xs text-slate-400 mt-1">
                ID: {payment.invoice_id}
              </p>
            </div>
          </div>
        </div>

        {/* GATEWAY & AUDIT IDENTIFIERS */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Audit & Gateway Identifiers</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Gateway Ref / Cheque No:</span>
              <span className="font-mono font-medium text-slate-800 break-all">
                {payment.gateway_transaction_id || '—'}
              </span>
            </div>

            {payment.razorpay_order_id && (
              <div>
                <span className="text-slate-500 block">Razorpay Order ID:</span>
                <span className="font-mono font-medium text-slate-800 break-all">
                  {payment.razorpay_order_id}
                </span>
              </div>
            )}

            {payment.razorpay_payment_id && (
              <div>
                <span className="text-slate-500 block">Razorpay Payment ID:</span>
                <span className="font-mono font-medium text-slate-800 break-all">
                  {payment.razorpay_payment_id}
                </span>
              </div>
            )}

            {payment.razorpay_signature && (
              <div className="col-span-full">
                <span className="text-slate-500 block">HMAC-SHA256 Signature (Verified):</span>
                <span className="font-mono text-slate-600 break-all text-[11px] bg-white p-2 border border-slate-200 rounded block mt-0.5">
                  {payment.razorpay_signature}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* NOTES SECTION */}
        {payment.notes && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <span className="font-semibold text-slate-600 uppercase tracking-wider block">
              Internal / Transaction Notes:
            </span>
            <p className="text-slate-700 whitespace-pre-wrap">{payment.notes}</p>
          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
