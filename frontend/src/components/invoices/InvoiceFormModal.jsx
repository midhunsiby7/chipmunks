import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { invoiceService } from '../../services/invoiceService';
import { userService } from '../../services/userService';
import { subscriptionService } from '../../services/subscriptionService';
import { taxService } from '../../services/taxService';
import { discountService } from '../../services/discountService';
import { formatCurrency } from '../../utils/formatters';
import {
  validateInvoicePayload,
  calculateEstimatedInvoiceTotals,
} from '../../utils/invoiceValidation';
import {
  Receipt,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react';

const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'US Dollar (USD - $)' },
  { code: 'INR', name: 'Indian Rupee (INR - ₹)' },
  { code: 'EUR', name: 'Euro (EUR - €)' },
  { code: 'GBP', name: 'British Pound (GBP - £)' },
];

function InvoiceFormBody({
  onClose,
  onSuccess,
}) {
  // Section A: Customer & Subscription
  const [customerId, setCustomerId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');

  // Section B: Dates, Currency & Notes
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 16);
  });
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');

  // Section C: Line Items
  const [lines, setLines] = useState([
    {
      id: 'init-line',
      description: 'Consulting / Professional Services',
      quantity: 1,
      unit_price: '1000.00',
    },
  ]);

  // Section D: Taxes & Discount
  const [taxRuleId, setTaxRuleId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [promoValidation, setPromoValidation] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // References state
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Submission & validation state
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load active customers and tax rules
  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      userService.listUsers({ role: 'customer', pageSize: 100 }),
      taxService.listTaxRules({ isActive: true, pageSize: 100 }),
    ]).then(([userRes, taxRes]) => {
      if (!isMounted) return;

      if (userRes.status === 'fulfilled' && userRes.value?.items) {
        setCustomers(userRes.value.items);
      }
      if (taxRes.status === 'fulfilled' && taxRes.value?.items) {
        setTaxRules(taxRes.value.items);
      }
      setLoadingRefs(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCustomerChange = (e) => {
    const val = e.target.value;
    setCustomerId(val);
    setSubscriptionId('');
    if (!val) {
      setSubscriptions([]);
    }
  };

  // When customer changes, load customer's subscriptions
  useEffect(() => {
    if (!customerId) return;

    let isMounted = true;
    subscriptionService
      .listSubscriptions({ customerId, pageSize: 50 })
      .then((res) => {
        if (isMounted) {
          setSubscriptions(res.items || []);
        }
      })
      .catch(() => {
        if (isMounted) setSubscriptions([]);
      });

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  const selectedTaxRule = taxRules.find((t) => t.id === taxRuleId) || null;

  // Line item manipulation
  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        description: '',
        quantity: 1,
        unit_price: '0.00',
      },
    ]);
  };

  const removeLine = (idx) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx, field, value) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Promo verification
  const appliedDiscountDeduction = promoValidation?.valid
    ? Number(promoValidation.calculated_discount) || 0
    : 0;

  const estimatedTotals = calculateEstimatedInvoiceTotals(
    lines,
    appliedDiscountDeduction,
    selectedTaxRule
  );

  const handleVerifyPromo = async () => {
    if (!discountCode.trim()) {
      setPromoValidation(null);
      return;
    }

    setValidatingPromo(true);
    try {
      const res = await discountService.validateDiscountCode({
        code: discountCode.trim(),
        amount: estimatedTotals.subtotal,
        quantity: lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0),
      });
      setPromoValidation(res);
    } catch (err) {
      setPromoValidation({
        valid: false,
        code: discountCode.trim().toUpperCase(),
        calculated_discount: 0,
        message: err?.response?.data?.detail || err?.message || 'Invalid promotional code.',
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    let dueIso = null;
    if (dueDate) {
      try {
        dueIso = new Date(dueDate).toISOString();
      } catch {
        dueIso = dueDate;
      }
    }

    const payload = {
      customer_id: customerId,
      subscription_id: subscriptionId || null,
      due_date: dueIso,
      currency,
      notes: notes.trim() || null,
      tax_rule_id: taxRuleId || null,
      discount_code: discountCode.trim().toUpperCase() || null,
      lines: lines.map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity) || 1,
        unit_price: Number(l.unit_price) || 0,
      })),
    };

    const validation = validateInvoicePayload(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      await invoiceService.createInvoice(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d) => d.msg || d).join(', ')
          : null) ||
        err?.message ||
        'Failed to issue invoice. Please check parameters.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <div className="flex-1 font-medium">{serverError}</div>
        </div>
      )}

      {/* SECTION A: CUSTOMER & SUBSCRIPTION */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section A — Recipient & Contract Scoping</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="inv-customer-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Billed Customer *
            </label>
            <select
              id="inv-customer-select"
              required
              value={customerId}
              onChange={handleCustomerChange}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.customer_id ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
              }`}
            >
              <option value="">-- Choose active customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || 'Unnamed'} ({c.email}) {c.company_name ? `— ${c.company_name}` : ''}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="text-xs text-red-600 mt-1">{errors.customer_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="inv-subscription-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Related Subscription (Optional)
            </label>
            <select
              id="inv-subscription-select"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              disabled={!customerId}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="">-- No specific subscription linked --</option>
              {subscriptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subscription_code} — {formatCurrency(s.total_amount)} ({s.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION B: DATES, CURRENCY & NOTES */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section B — Payment Terms & Currency</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="inv-due-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Due Date *
            </label>
            <input
              id="inv-due-date"
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.due_date ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
              }`}
            />
            {errors.due_date && (
              <p className="text-xs text-red-600 mt-1">{errors.due_date}</p>
            )}
          </div>

          <div>
            <label htmlFor="inv-currency-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Billing Currency
            </label>
            <select
              id="inv-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="inv-notes-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Customer / Invoice Notes
          </label>
          <textarea
            id="inv-notes-input"
            rows={2}
            placeholder="Payment instructions or special billing terms..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* SECTION C: ITEMIZED LINES */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2 text-slate-800">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-sm">Section C — Itemized Invoice Lines *</h3>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 hover:border-indigo-400 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item Line</span>
          </button>
        </div>

        {errors.lines && (
          <p className="text-xs text-red-600 font-medium">{errors.lines}</p>
        )}

        <div className="space-y-3">
          {lines.map((line, idx) => {
            const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);

            return (
              <div
                key={line.id}
                className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Line #{idx + 1}</span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Subscription usage, Enterprise license"
                      value={line.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                        errors[`line_${idx}_description`] ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Qty *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                        errors[`line_${idx}_quantity`] ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Unit Price *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                        errors[`line_${idx}_price`] ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                      }`}
                    />
                  </div>

                  <div className="text-right">
                    <span className="block text-[11px] text-slate-500">Line Total</span>
                    <span className="text-xs font-bold text-slate-800 block pt-1">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION D: TAXES, DISCOUNTS & ESTIMATED TOTALS */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Percent className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section D — Tax, Discounts & Financial Breakdown</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
            <div>
              <label htmlFor="inv-tax-rule" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Applicable Tax Rule
              </label>
              <select
                id="inv-tax-rule"
                value={taxRuleId}
                onChange={(e) => setTaxRuleId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- No Direct Tax Applied --</option>
                {taxRules.map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {tx.name} ({tx.tax_code}) — {tx.is_fixed ? formatCurrency(tx.rate_percentage) : `${tx.rate_percentage}%`} [{tx.country_code}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="inv-discount-code" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Promotional Discount Code
              </label>
              <div className="flex space-x-2">
                <input
                  id="inv-discount-code"
                  type="text"
                  placeholder="e.g. ENTERPRISE20"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    if (promoValidation) setPromoValidation(null);
                  }}
                  className="flex-1 px-3 py-2 text-sm font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleVerifyPromo}
                  disabled={!discountCode.trim() || validatingPromo}
                  className="shrink-0 text-xs px-3"
                >
                  {validatingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify Code'}
                </Button>
              </div>

              {promoValidation && (
                <div
                  className={`mt-2 p-2.5 rounded-lg text-xs flex items-start space-x-2 border ${
                    promoValidation.valid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {promoValidation.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="font-semibold block">
                      {promoValidation.valid ? `Promo Applied: ${promoValidation.code}` : 'Invalid Promotion'}
                    </span>
                    <span>{promoValidation.message}</span>
                    {promoValidation.valid && (
                      <span className="block font-bold text-emerald-700 mt-0.5">
                        Deduction: -{formatCurrency(promoValidation.calculated_discount)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Preview */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 border-slate-100">
              Estimated Financial Summary
            </h4>

            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(estimatedTotals.subtotal)}</span>
            </div>

            {appliedDiscountDeduction > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 font-medium">
                <span>Promotional Discount:</span>
                <span>-{formatCurrency(appliedDiscountDeduction)}</span>
              </div>
            )}

            {selectedTaxRule && (
              <div className="flex justify-between text-xs text-indigo-700">
                <span>
                  Tax ({selectedTaxRule.name} - {selectedTaxRule.is_fixed ? 'Flat' : `${selectedTaxRule.rate_percentage}%`}):
                </span>
                <span className="font-semibold">{formatCurrency(estimatedTotals.taxAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total Amount:</span>
              <span className="text-indigo-600">{formatCurrency(estimatedTotals.totalAmount)}</span>
            </div>

            <p className="text-[11px] text-slate-400 italic flex items-center gap-1 pt-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Official invoice sequence number and balances are authoritative upon backend confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={submitting || loadingRefs}>
          {submitting ? (
            <span className="flex items-center space-x-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Issuing Invoice...</span>
            </span>
          ) : (
            'Issue Invoice'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function InvoiceFormModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Manual Invoice"
      size="xl"
    >
      <InvoiceFormBody
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
