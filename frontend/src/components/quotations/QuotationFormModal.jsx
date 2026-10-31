import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { quotationService } from '../../services/quotationService';
import { userService } from '../../services/userService';
import { productService } from '../../services/productService';
import { planService } from '../../services/planService';
import { taxService } from '../../services/taxService';
import { discountService } from '../../services/discountService';
import { formatCurrency } from '../../utils/formatters';
import {
  validateQuotationPayload,
  calculateQuotationTotals,
} from '../../utils/quotationValidation';
import {
  FileSpreadsheet,
  Users,
  Calendar,
  Layers,
  Package,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Percent,
  Tag,
  CheckCircle2,
  Info,
} from 'lucide-react';

function QuotationFormBody({
  onClose,
  onSuccess,
}) {
  // Section A: Customer & Template
  const [customerId, setCustomerId] = useState('');
  const [templateId, setTemplateId] = useState('');

  // Section B: Validity & Notes
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 16);
  });
  const [termsAndConditions, setTermsAndConditions] = useState(
    'Payment due within 30 days of quotation confirmation.'
  );
  const [notes, setNotes] = useState('');

  // Section C: Line Items
  const [lines, setLines] = useState([
    {
      id: 'initial-line',
      description: '',
      quantity: 1,
      unit_price: '',
      product_variant_id: null,
      plan_id: null,
      type: 'custom',
    },
  ]);

  // Section D: Taxes & Discount
  const [taxRuleId, setTaxRuleId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [promoValidation, setPromoValidation] = useState(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  // Dropdown reference options
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [taxRules, setTaxRules] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Errors & submission
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load supporting reference data asynchronously
  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      userService.listUsers({ role: 'customer', pageSize: 100 }),
      quotationService.listTemplates({ pageSize: 50 }),
      productService.listProducts({ isActive: true, pageSize: 100 }),
      planService.listPlans({ isActive: true, pageSize: 100 }),
      taxService.listTaxRules({ isActive: true, pageSize: 50 }),
    ]).then(([custRes, tplRes, prodRes, planRes, taxRes]) => {
      if (isMounted) {
        if (custRes.status === 'fulfilled' && custRes.value?.items) {
          setCustomers(custRes.value.items);
        }
        if (tplRes.status === 'fulfilled' && tplRes.value?.items) {
          setTemplates(tplRes.value.items);
        }
        if (prodRes.status === 'fulfilled' && prodRes.value?.items) {
          setProducts(prodRes.value.items);
        }
        if (planRes.status === 'fulfilled' && planRes.value?.items) {
          setPlans(planRes.value.items);
        }
        if (taxRes.status === 'fulfilled' && taxRes.value?.items) {
          setTaxRules(taxRes.value.items);
        }
        setLoadingRefs(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle template selection
  const handleTemplateChange = (selectedTplId) => {
    setTemplateId(selectedTplId);
    if (!selectedTplId) return;

    const tpl = templates.find((t) => t.id === selectedTplId);
    if (tpl) {
      if (tpl.terms_and_conditions) setTermsAndConditions(tpl.terms_and_conditions);
      if (tpl.default_validity_days) {
        const d = new Date();
        d.setDate(d.getDate() + Number(tpl.default_validity_days));
        setValidUntil(d.toISOString().slice(0, 16));
      }
    }
  };

  // Line item manipulation
  const addProductLine = (productId) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    // Pick first variant or use product base sales_price
    const firstVariant = prod.variants?.[0];
    const newUnitPrice = firstVariant ? firstVariant.price : prod.sales_price;
    const desc = firstVariant
      ? `${prod.name} (${firstVariant.name})`
      : prod.name;

    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        description: desc,
        quantity: 1,
        unit_price: String(newUnitPrice || 0),
        product_variant_id: firstVariant?.id || null,
        plan_id: null,
        type: 'product',
      },
    ]);
  };

  const addPlanLine = (planId) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        description: `${plan.name} (${plan.code}) - ${plan.billing_interval} subscription`,
        quantity: plan.minimum_quantity || 1,
        unit_price: String(plan.price || 0),
        product_variant_id: null,
        plan_id: plan.id,
        type: 'plan',
      },
    ]);
  };

  const addCustomLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random()}`,
        description: '',
        quantity: 1,
        unit_price: '',
        product_variant_id: null,
        plan_id: null,
        type: 'custom',
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

  // Find selected tax rule
  const selectedTaxRule = taxRules.find((t) => t.id === taxRuleId) || null;

  // Informational preview totals
  const appliedDiscountDeduction = promoValidation?.valid
    ? Number(promoValidation.calculated_discount) || 0
    : 0;
  const totals = calculateQuotationTotals(lines, selectedTaxRule, appliedDiscountDeduction);

  const handleVerifyPromo = async () => {
    if (!discountCode.trim()) {
      setPromoValidation(null);
      return;
    }

    const currentSubtotal = lines.reduce((acc, l) => {
      const q = Number(l.quantity) || 0;
      const p = Number(l.unit_price) || 0;
      return acc + q * p;
    }, 0);

    const totalQty = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);

    setValidatingPromo(true);
    try {
      const res = await discountService.validateDiscountCode({
        code: discountCode.trim(),
        amount: currentSubtotal,
        quantity: totalQty,
      });
      setPromoValidation(res);
    } catch (err) {
      setPromoValidation({
        valid: false,
        code: discountCode.trim().toUpperCase(),
        calculated_discount: 0,
        message: err?.response?.data?.detail || err?.message || 'Invalid or inapplicable discount code.',
      });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const payload = {
      customer_id: customerId,
      template_id: templateId || null,
      valid_until: validUntil,
      terms_and_conditions: termsAndConditions || null,
      notes: notes || null,
      discount_code: discountCode || null,
      tax_rule_id: taxRuleId || null,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        product_variant_id: l.product_variant_id || null,
        plan_id: l.plan_id || null,
        discount_amount: 0,
        tax_amount: 0,
      })),
    };

    const validation = validateQuotationPayload(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      await quotationService.createQuotation(payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d) => d.msg || d).join(', ')
          : null) ||
        err?.message ||
        'Failed to create quotation. Please check inputs and retry.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Quotation Creation Error</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {/* SECTION A: CUSTOMER & TEMPLATE */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section A — Customer & Template</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="quote-customer-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Customer *
            </label>
            <select
              id="quote-customer-select"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.customer_id ? 'border-red-500' : 'border-slate-300'
              }`}
            >
              <option value="">-- Choose Customer from Directory --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name || 'Unnamed'} ({c.email}) {c.company_name ? `— ${c.company_name}` : ''}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="text-xs text-red-600 mt-1">{errors.customer_id}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Customer identity associated with this quotation
            </p>
          </div>

          <div>
            <label htmlFor="quote-template-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Apply Quotation Template (Optional)
            </label>
            <select
              id="quote-template-select"
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- No Template (Custom Blank Quotation) --</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.default_validity_days} days validity)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Pre-fills standard terms and validity durations
            </p>
          </div>
        </div>
      </div>

      {/* SECTION B: VALIDITY & NOTES */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <Calendar className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-sm">Section B — Validity & Terms</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="quote-valid-until-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Quotation Expiry Date (Valid Until) *
            </label>
            <input
              id="quote-valid-until-input"
              type="datetime-local"
              required
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.valid_until ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.valid_until && (
              <p className="text-xs text-red-600 mt-1">{errors.valid_until}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Quotations cannot be accepted after this date has elapsed
            </p>
          </div>

          <div>
            <label htmlFor="quote-notes-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer-Facing Notes
            </label>
            <input
              id="quote-notes-input"
              type="text"
              placeholder="e.g. Special enterprise pilot pricing; includes onboarding."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="quote-terms-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Terms & Conditions
          </label>
          <textarea
            id="quote-terms-input"
            rows={2}
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* SECTION C: ITEM LINE MANAGEMENT */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-800">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-sm">Section C — Itemized Lines</h3>
          </div>

          {/* Quick-add buttons */}
          <div className="flex items-center gap-2">
            {/* Add Product Line Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addProductLine(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="text-xs font-medium px-2.5 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>
                + Add Product
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.sales_price)})
                </option>
              ))}
            </select>

            {/* Add Plan Line Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addPlanLine(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              className="text-xs font-medium px-2.5 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="" disabled>
                + Add Subscription Plan
              </option>
              {plans.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} ({formatCurrency(pl.price, pl.currency)})
                </option>
              ))}
            </select>

            <Button type="button" variant="outline" size="sm" onClick={addCustomLine}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Custom Line
            </Button>
          </div>
        </div>

        {errors.lines && (
          <p className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            {errors.lines}
          </p>
        )}

        <div className="space-y-3">
          {lines.map((line, idx) => {
            const lineSubtotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);

            return (
              <div
                key={line.id}
                className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    {line.type === 'plan' ? (
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    ) : line.type === 'product' ? (
                      <Package className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    Line #{idx + 1}
                  </span>

                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Remove Line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Description *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Line item name or description..."
                      value={line.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                        errors[`line_${idx}_description`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors[`line_${idx}_description`] && (
                      <p className="text-[11px] text-red-600 mt-0.5">
                        {errors[`line_${idx}_description`]}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                        errors[`line_${idx}_quantity`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Unit Price (₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={line.unit_price}
                      onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                      className={`w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white ${
                        errors[`line_${idx}_price`] ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                  </div>

                  <div className="md:col-span-2 text-right">
                    <span className="block text-[11px] text-slate-500">Line Total</span>
                    <span className="text-xs font-bold text-slate-900 block pt-1">
                      {formatCurrency(lineSubtotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION D: TAXES, DISCOUNTS & TOTALS */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <Percent className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-sm">Section D — Taxes & Financial Summary</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Tax & Discount Inputs */}
          <div className="space-y-3">
            <div>
              <label htmlFor="quote-tax-rule-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Applicable Tax Rule
              </label>
              <select
                id="quote-tax-rule-select"
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
              <p className="text-[11px] text-slate-500 mt-1">
                Tax engine calculates liabilities against the quotation subtotal
              </p>
            </div>

            <div>
              <label htmlFor="quote-discount-code-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Discount / Coupon Code (Optional)
              </label>
              <div className="flex space-x-2">
                <input
                  id="quote-discount-code-input"
                  type="text"
                  placeholder="e.g. PROMO20"
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
                  {validatingPromo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    'Verify Code'
                  )}
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
                      {promoValidation.valid
                        ? `Promo Applied: ${promoValidation.code}`
                        : 'Invalid Promotion'}
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

              <p className="text-[11px] text-slate-500 mt-1">
                Verified live via backend discount engine before quotation creation.
              </p>
            </div>
          </div>

          {/* Real-time Financial Breakdown Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 border-slate-100">
              Estimated Financial Summary
            </h4>

            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(totals.subtotal)}</span>
            </div>

            {appliedDiscountDeduction > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 font-medium">
                <span>Promotional Discount:</span>
                <span>-{formatCurrency(appliedDiscountDeduction)}</span>
              </div>
            )}

            {selectedTaxRule && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>
                  Tax ({selectedTaxRule.name} - {selectedTaxRule.is_fixed ? 'Flat' : `${selectedTaxRule.rate_percentage}%`}):
                </span>
                <span className="font-semibold text-indigo-700">{formatCurrency(totals.taxAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Estimated Grand Total:</span>
              <span className="text-indigo-600">{formatCurrency(totals.totalAmount)}</span>
            </div>

            <p className="text-[11px] text-slate-400 italic flex items-center gap-1 pt-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Authoritative totals and discount deductions are finalized upon backend creation.
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
            <span className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Quotation...</span>
            </span>
          ) : (
            'Generate Customer Quotation'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function QuotationFormModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Sales Quotation"
      maxWidth="max-w-4xl"
    >
      <QuotationFormBody
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
