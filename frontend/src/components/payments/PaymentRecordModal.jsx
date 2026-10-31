import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { paymentService } from '../../services/paymentService';
import { userService } from '../../services/userService';
import { invoiceService } from '../../services/invoiceService';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_OPTIONS,
  validatePaymentPayload,
  calculateReconciledBalance,
} from '../../utils/paymentValidation';
import { formatCurrency } from '../../utils/formatters';
import {
  CreditCard,
  User,
  Receipt,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function PaymentRecordModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedInvoice = null,
}) {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Form State
  const [customerId, setCustomerId] = useState(preselectedInvoice?.customer_id || '');
  const [invoiceId, setInvoiceId] = useState(preselectedInvoice?.id || '');
  const [amount, setAmount] = useState(preselectedInvoice?.amount_due ? String(preselectedInvoice.amount_due) : '');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.BANK_TRANSFER);
  const [currency, setCurrency] = useState(preselectedInvoice?.currency || 'USD');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  // Initial reference fetch
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      userService.listUsers({ role: 'customer', pageSize: 100 }),
      invoiceService.listInvoices({ pageSize: 100 }),
    ])
      .then(([custRes, invRes]) => {
        if (isMounted) {
          setCustomers(custRes.items || []);
          // Only show unpaid or partially paid invoices that can receive payments
          const eligibleInvoices = (invRes.items || []).filter(
            (inv) => !['paid', 'cancelled', 'void'].includes((inv.status || '').toLowerCase()) && Number(inv.amount_due) > 0
          );
          setInvoices(eligibleInvoices);
        }
      })
      .catch((err) => {
        console.error('Failed to load customers or invoices:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingRefs(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter invoices if customer is selected
  const availableInvoices = customerId
    ? invoices.filter((i) => i.customer_id === customerId)
    : invoices;

  const selectedInvoice = invoices.find((i) => i.id === invoiceId) || preselectedInvoice || null;

  // When selected invoice changes, update currency and autofill helper if amount is empty
  const handleInvoiceChange = (e) => {
    const invId = e.target.value;
    setInvoiceId(invId);
    const found = invoices.find((i) => i.id === invId);
    if (found) {
      setCurrency(found.currency || 'USD');
      if (!amount || amount === '0') {
        setAmount(String(found.amount_due));
      }
      if (!customerId) {
        setCustomerId(found.customer_id);
      }
    }
  };

  const handleCustomerChange = (e) => {
    const custId = e.target.value;
    setCustomerId(custId);
    // If current selected invoice does not belong to new customer, clear invoice
    if (invoiceId) {
      const match = invoices.find((i) => i.id === invoiceId && i.customer_id === custId);
      if (!match) {
        setInvoiceId('');
        setAmount('');
      }
    }
  };

  const handlePayInFull = () => {
    if (selectedInvoice) {
      setAmount(String(selectedInvoice.amount_due));
    }
  };

  // Live reconciliation preview
  const balancePreview = selectedInvoice
    ? calculateReconciledBalance(selectedInvoice.total_amount, selectedInvoice.amount_paid, amount)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const payload = {
      invoice_id: invoiceId,
      amount: Number(amount) || 0,
      currency: currency.trim().toUpperCase() || 'USD',
      payment_method: paymentMethod,
      transaction_reference: transactionRef.trim() || null,
      notes: notes.trim() || null,
    };

    const validation = validatePaymentPayload(payload, selectedInvoice);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      await paymentService.recordPayment(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d) => d.msg || d).join(', ')
          : null) ||
        err?.message ||
        'Failed to record payment. Please review invoice balance and details.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
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
            <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
            <p className="text-xs text-slate-500">
              Manual transaction recording & invoice balance reconciliation
            </p>
          </div>
        </div>
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 font-medium">{serverError}</div>
          </div>
        )}

        {/* SECTION 1: CUSTOMER & INVOICE ALLOCATION */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
            <User className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-xs uppercase tracking-wider">
              1. Payer & Invoice Allocation
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pay-customer-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Filter by Customer
              </label>
              <select
                id="pay-customer-select"
                value={customerId}
                onChange={handleCustomerChange}
                disabled={loadingRefs}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                <option value="">-- All Active Customers --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || 'Unnamed'} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="pay-invoice-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Invoice *
              </label>
              <select
                id="pay-invoice-select"
                required
                value={invoiceId}
                onChange={handleInvoiceChange}
                disabled={loadingRefs}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.invoice_id ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              >
                <option value="">-- Choose outstanding invoice --</option>
                {availableInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — Due: {formatCurrency(inv.amount_due, inv.currency)} (Total: {formatCurrency(inv.total_amount, inv.currency)})
                  </option>
                ))}
              </select>
              {errors.invoice_id && (
                <p className="text-xs text-red-600 mt-1">{errors.invoice_id}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: RECONCILIATION & BALANCE PREVIEW */}
        {selectedInvoice && balancePreview && (
          <div className="p-4 bg-gradient-to-br from-indigo-50/60 to-slate-50 border border-indigo-100 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100/80">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 flex items-center space-x-1.5">
                <Receipt className="w-3.5 h-3.5" />
                <span>Invoice Ledger Status</span>
              </span>
              <button
                type="button"
                onClick={handlePayInFull}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 transition-colors"
              >
                Autofill Full Balance ({formatCurrency(selectedInvoice.amount_due, selectedInvoice.currency)})
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block mb-0.5">Invoice Total</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(selectedInvoice.total_amount, selectedInvoice.currency)}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 block mb-0.5">Currently Paid</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(selectedInvoice.amount_paid, selectedInvoice.currency)}
                </span>
              </div>

              <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
                <span className="text-amber-700 font-semibold block mb-0.5">Outstanding Due</span>
                <span className="font-mono font-bold text-amber-900">
                  {formatCurrency(selectedInvoice.amount_due, selectedInvoice.currency)}
                </span>
              </div>
            </div>

            {/* Reconciliation Transition Arrow */}
            {amount && Number(amount) > 0 && !balancePreview.isOverpayment && (
              <div className="p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    New Paid: <strong>{formatCurrency(balancePreview.updatedPaid, selectedInvoice.currency)}</strong>
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-right">
                  <span className="text-slate-500 mr-1.5">Remaining Balance:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(balancePreview.remainingDue, selectedInvoice.currency)}
                  </span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {balancePreview.resultingStatus}
                  </span>
                </div>
              </div>
            )}

            {balancePreview.isOverpayment && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
                <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>
                  <strong>Overpayment Blocked:</strong> Entered amount exceeds the remaining invoice balance due of {formatCurrency(selectedInvoice.amount_due, selectedInvoice.currency)}.
                </span>
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: TRANSACTION DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pay-amount-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Amount *
            </label>
            <div className="relative">
              <input
                id="pay-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${
                  errors.amount ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-600 mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <label htmlFor="pay-method-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Method *
            </label>
            <select
              id="pay-method-select"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pay-tx-ref-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Transaction / Cheque Reference
            </label>
            <input
              id="pay-tx-ref-input"
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. UTR-99882233 or CHQ-00129"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label htmlFor="pay-currency-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Currency
            </label>
            <select
              id="pay-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            >
              <option value="USD">USD ($)</option>
              <option value="INR">INR (₹)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div className="col-span-full">
            <label htmlFor="pay-notes-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reconciliation / Accounting Notes
            </label>
            <textarea
              id="pay-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add optional internal context, bank slip details, or customer notes..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting || (balancePreview && balancePreview.isOverpayment)}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reconciling Payment...
              </>
            ) : (
              'Confirm & Record Payment'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
