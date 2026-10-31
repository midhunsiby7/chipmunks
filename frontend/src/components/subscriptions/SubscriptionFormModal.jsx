import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { subscriptionService } from '../../services/subscriptionService';
import { userService } from '../../services/userService';
import { planService } from '../../services/planService';
import { productService } from '../../services/productService';
import { taxService } from '../../services/taxService';
import { discountService } from '../../services/discountService';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatters';
import {
  validateSubscriptionPayload,
  calculateEstimatedSubscriptionFinancials,
  PAYMENT_TERMS_OPTIONS,
} from '../../utils/subscriptionValidation';
import { formatBillingCadence } from '../../utils/planAndTaxValidation';
import {
  Users,
  Layers,
  Package,
  Calendar,
  AlertCircle,
  Loader2,
  Percent,
  Trash2,
  CheckCircle2,
  Info,
} from 'lucide-react';

function SubscriptionFormBody({
  onClose,
  onSuccess,
}) {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  // Section A: Customer Assignment
  const [customerId, setCustomerId] = useState(() => (isCustomer ? user?.id || '' : ''));

  // Section B: Plan Association
  const [planId, setPlanId] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Section C: Subscription Terms & Dates
  const [paymentTerms, setPaymentTerms] = useState('due_on_receipt');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [trialDays, setTrialDays] = useState('0');
  const [notes, setNotes] = useState('');

  // Section D: Extra Product Line Items
  const [lines, setLines] = useState([]);

  // Section E: Taxes, Discounts & Totals
  const [taxRuleId, setTaxRuleId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [promoValidation, setPromoValidation] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // References state
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Submission & validation state
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load references
  useEffect(() => {
    let isMounted = true;

    const refPromises = [
      planService.listPlans({ isActive: true, pageSize: 100 }),
      productService.listProducts({ isActive: true, pageSize: 100 }),
      taxService.listTaxRules({ isActive: true, pageSize: 100 }),
    ];

    if (!isCustomer) {
      refPromises.push(userService.listUsers({ role: 'customer', pageSize: 100 }));
    }

    Promise.allSettled(refPromises).then(([planRes, prodRes, taxRes, userRes]) => {
      if (!isMounted) return;

      if (planRes.status === 'fulfilled' && planRes.value?.items) {
        setPlans(planRes.value.items);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value?.items) {
        setProducts(prodRes.value.items);
      }
      if (taxRes.status === 'fulfilled' && taxRes.value?.items) {
        setTaxRules(taxRes.value.items);
      }
      if (userRes && userRes.status === 'fulfilled' && userRes.value?.items) {
        setCustomers(userRes.value.items);
      }
      setLoadingRefs(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isCustomer]);

  // Selected references
  const selectedPlan = plans.find((p) => p.id === planId) || null;
  const selectedTaxRule = taxRules.find((t) => t.id === taxRuleId) || null;

  // Sync min quantity when plan is selected
  const handlePlanChange = (selectedPlanId) => {
    setPlanId(selectedPlanId);
    const p = plans.find((item) => item.id === selectedPlanId);
    if (p && p.minimum_quantity && Number(quantity) < p.minimum_quantity) {
      setQuantity(String(p.minimum_quantity));
    }
  };

  // Line item manipulation for extra product variants
  const addProductLine = (productId) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const firstVariant = prod.variants?.[0];
    const unitPrice = firstVariant ? firstVariant.price : prod.sales_price;
    const desc = firstVariant
      ? `${prod.name} (${firstVariant.name})`
      : prod.name;

    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        product_variant_id: firstVariant?.id || null,
        description: desc,
        quantity: 1,
        unit_price: String(unitPrice || 0),
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

  // Promo code live server validation
  const appliedDiscountDeduction = promoValidation?.valid
    ? Number(promoValidation.calculated_discount) || 0
    : 0;

  const estimatedTotals = calculateEstimatedSubscriptionFinancials(
    selectedPlan,
    quantity,
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
        quantity: Number(quantity) || 1,
        planId: planId || null,
      });
      setPromoValidation(res);
    } catch (err) {
      setPromoValidation({
        valid: false,
        code: discountCode.trim().toUpperCase(),
        calculated_discount: 0,
        message: err?.response?.data?.detail || err?.message || 'Invalid or inapplicable promotional code.',
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    let startIso = null;
    if (startDate) {
      try {
        startIso = new Date(startDate).toISOString();
      } catch {
        startIso = startDate;
      }
    }

    const payload = {
      customer_id: customerId,
      plan_id: planId,
      quantity: Number(quantity) || 1,
      payment_terms: paymentTerms,
      start_date: startIso,
      trial_days: Number(trialDays) || 0,
      notes: notes.trim() || null,
      discount_code: discountCode.trim().toUpperCase() || null,
      tax_rule_id: taxRuleId || null,
      lines: lines.map((l) => ({
        product_variant_id: l.product_variant_id || null,
        description: l.description,
        quantity: Number(l.quantity) || 1,
        unit_price: Number(l.unit_price) || 0,
      })),
    };

    const validation = validateSubscriptionPayload(payload, selectedPlan);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      await subscriptionService.createSubscription(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d) => d.msg || d).join(', ')
          : null) ||
        err?.message ||
        'Failed to provision subscription. Please check input parameters.';
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

      {/* SECTION A: CUSTOMER ASSIGNMENT */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section A — Customer Assignment</h3>
        </div>

        {isCustomer ? (
          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
            <span className="text-slate-500 block">Subscriber Identity:</span>
            <span className="font-bold text-slate-800 block text-sm">
              {user?.displayName || user?.email}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">ID: {user?.id}</span>
          </div>
        ) : (
          <div>
            <label htmlFor="sub-customer-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Customer Account *
            </label>
            <select
              id="sub-customer-select"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
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
            {errors.customer_id ? (
              <p className="text-xs text-red-600 mt-1">{errors.customer_id}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Customer account assigned to this recurring contract.
              </p>
            )}
          </div>
        )}
      </div>

      {/* SECTION B: PLAN SELECTION & QUANTITY */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section B — Plan Association & Seats</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="sub-plan-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Subscription Plan *
            </label>
            <select
              id="sub-plan-select"
              required
              value={planId}
              onChange={(e) => handlePlanChange(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.plan_id ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
              }`}
            >
              <option value="">-- Choose subscription plan --</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — {formatCurrency(p.price)} / {formatBillingCadence(p.billing_interval, p.interval_count)}
                </option>
              ))}
            </select>
            {errors.plan_id ? (
              <p className="text-xs text-red-600 mt-1">{errors.plan_id}</p>
            ) : selectedPlan ? (
              <p className="text-[11px] text-indigo-700 font-medium mt-1">
                Cadence: {formatBillingCadence(selectedPlan.billing_interval, selectedPlan.interval_count)} | Min Quantity: {selectedPlan.minimum_quantity || 1}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Select from active catalog plans.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="sub-quantity-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Quantity / Seat Count *
            </label>
            <input
              id="sub-quantity-input"
              type="number"
              min={selectedPlan?.minimum_quantity || 1}
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`w-full px-3 py-2 text-sm font-semibold bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.quantity ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
              }`}
            />
            {errors.quantity && (
              <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION C: EXTRA PRODUCT VARIANT ADD-ONS */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2 text-slate-800">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-sm">Section C — Additional Product Lines (Optional)</h3>
          </div>

          {products.length > 0 && (
            <div className="relative inline-block text-left">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addProductLine(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg cursor-pointer shadow-2xs"
                defaultValue=""
              >
                <option value="" disabled>
                  + Add Product Variant Add-on
                </option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatCurrency(p.sales_price)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {lines.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2">
            No supplementary variant add-ons attached. Subscription contains the primary plan only.
          </p>
        ) : (
          <div className="space-y-3">
            {lines.map((line, idx) => {
              const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);

              return (
                <div
                  key={line.id}
                  className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Add-on Item #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove add-on"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Description *
                      </label>
                      <input
                        type="text"
                        required
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
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
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={line.unit_price}
                        onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div className="text-right">
                      <span className="block text-[11px] text-slate-500">Total</span>
                      <span className="text-xs font-bold text-slate-800 block pt-1">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION D: SUBSCRIPTION TERMS & DATES */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section D — Terms & Schedule</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="sub-start-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Start Date/Time
            </label>
            <input
              id="sub-start-date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              First recurring period initiates on this timestamp.
            </p>
          </div>

          <div>
            <label htmlFor="sub-payment-terms" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Payment Terms
            </label>
            <select
              id="sub-payment-terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PAYMENT_TERMS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sub-trial-days" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Trial Days
            </label>
            <input
              id="sub-trial-days"
              type="number"
              min="0"
              step="1"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.trial_days ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.trial_days && (
              <p className="text-xs text-red-600 mt-1">{errors.trial_days}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="sub-notes-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Internal / Contract Notes
          </label>
          <textarea
            id="sub-notes-input"
            rows={2}
            placeholder="Special provisioning instructions or contractual terms..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* SECTION E: TAXES, DISCOUNTS & ESTIMATED SUMMARY */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Percent className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section E — Financial Calculations & Summary</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
            <div>
              <label htmlFor="sub-tax-rule" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Applicable Tax Rule
              </label>
              <select
                id="sub-tax-rule"
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
              <label htmlFor="sub-discount-code" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Promotional Discount Code
              </label>
              <div className="flex space-x-2">
                <input
                  id="sub-discount-code"
                  type="text"
                  placeholder="e.g. WELCOME20"
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

          {/* Real-time Breakdown Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 border-slate-100">
              Estimated Financial Summary
            </h4>

            <div className="flex justify-between text-xs text-slate-600">
              <span>Plan Base:</span>
              <span className="font-semibold text-slate-800">
                {selectedPlan ? formatCurrency(Number(selectedPlan.price) * (Number(quantity) || 1)) : '₹0.00'}
              </span>
            </div>

            {lines.length > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Add-on Products:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(
                    lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0)
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Subtotal:</span>
              <span className="text-slate-900">{formatCurrency(estimatedTotals.subtotal)}</span>
            </div>

            {appliedDiscountDeduction > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 font-medium">
                <span>Discount Deduction:</span>
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
              <span>Estimated First Period Total:</span>
              <span className="text-indigo-600">{formatCurrency(estimatedTotals.totalAmount)}</span>
            </div>

            <p className="text-[11px] text-slate-400 italic flex items-center gap-1 pt-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Authoritative period billing and invoice totals are finalized server-side upon provisioning.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL ACTIONS */}
      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={submitting || loadingRefs}>
          {submitting ? (
            <span className="flex items-center space-x-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Provisioning Subscription...</span>
            </span>
          ) : (
            'Provision Subscription'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function SubscriptionFormModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Provision New Subscription"
      size="xl"
    >
      <SubscriptionFormBody
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
