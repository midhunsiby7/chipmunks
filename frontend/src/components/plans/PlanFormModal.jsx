import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { planService } from '../../services/planService';
import { productService } from '../../services/productService';
import { formatCurrency } from '../../utils/formatters';
import {
  validatePlanPayload,
  formatBillingCadence,
  SUPPORTED_BILLING_INTERVALS,
} from '../../utils/planAndTaxValidation';
import {
  Layers,
  Calendar,
  AlertCircle,
  Loader2,
  Package,
  Clock,
  ShieldCheck,
  DollarSign,
  Info,
} from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
];

function PlanFormBody({
  planToEdit = null,
  onClose,
  onSuccess,
}) {
  const isEditing = Boolean(planToEdit);

  // Form state initialized directly from props
  const [code, setCode] = useState(() => planToEdit?.code || '');
  const [name, setName] = useState(() => planToEdit?.name || '');
  const [description, setDescription] = useState(() => planToEdit?.description || '');
  const [productId, setProductId] = useState(() => planToEdit?.product_id || '');
  const [price, setPrice] = useState(() =>
    planToEdit?.price !== undefined ? String(planToEdit.price) : ''
  );
  const [currency, setCurrency] = useState(() => planToEdit?.currency || 'USD');
  const [billingInterval, setBillingInterval] = useState(
    () => planToEdit?.billing_interval || 'monthly'
  );
  const [intervalCount, setIntervalCount] = useState(() =>
    planToEdit?.interval_count !== undefined ? String(planToEdit.interval_count) : '1'
  );
  const [minimumQuantity, setMinimumQuantity] = useState(() =>
    planToEdit?.minimum_quantity !== undefined ? String(planToEdit.minimum_quantity) : '1'
  );
  const [trialPeriodDays, setTrialPeriodDays] = useState(() =>
    planToEdit?.trial_period_days !== undefined ? String(planToEdit.trial_period_days) : '0'
  );
  const [availableFrom, setAvailableFrom] = useState(() => {
    if (planToEdit?.available_from) {
      try {
        return new Date(planToEdit.available_from).toISOString().slice(0, 16);
      } catch {
        return '';
      }
    }
    return '';
  });
  const [availableUntil, setAvailableUntil] = useState(() => {
    if (planToEdit?.available_until) {
      try {
        return new Date(planToEdit.available_until).toISOString().slice(0, 16);
      } catch {
        return '';
      }
    }
    return '';
  });
  const [isActive, setIsActive] = useState(() =>
    planToEdit?.is_active !== undefined ? planToEdit.is_active : true
  );

  // Products list for association
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Submission & validation state
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load active products for dropdown
  useEffect(() => {
    let isMounted = true;
    async function fetchProducts() {
      setLoadingProducts(true);
      try {
        const res = await productService.listProducts({ page: 1, pageSize: 100, isActive: true });
        if (isMounted && res?.items) {
          setProducts(res.items);
        }
      } catch {
        // Fallback gracefully if products cannot be loaded
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    }
    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const payload = {
      code,
      name,
      description: description || null,
      product_id: productId || null,
      price,
      currency,
      billing_interval: billingInterval,
      interval_count: intervalCount,
      minimum_quantity: minimumQuantity,
      trial_period_days: trialPeriodDays,
      available_from: availableFrom || null,
      available_until: availableUntil || null,
      is_active: isActive,
    };

    const validation = validatePlanPayload(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      if (isEditing) {
        await planService.updatePlan(planToEdit.id, payload);
      } else {
        await planService.createPlan(payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data?.detail)
          ? err.response.data.detail.map((d) => d.msg || d).join(', ')
          : null) ||
        err?.message ||
        'Failed to save subscription plan. Please check inputs and retry.';
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
            <p className="font-semibold">Plan Submission Error</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {/* SECTION A: BASIC INFORMATION */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Section A — Basic Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="plan-name-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Plan Name *
            </label>
            <input
              id="plan-name-input"
              type="text"
              required
              placeholder="e.g. Standard Cloud Monthly"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="plan-code-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Plan Code *
            </label>
            <input
              id="plan-code-input"
              type="text"
              required
              placeholder="e.g. PLAN-CLOUD-M"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 text-sm font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.code ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
            <p className="text-[11px] text-slate-500 mt-1">Unique alphanumeric identifier</p>
          </div>
        </div>

        <div>
          <label htmlFor="plan-product-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Associated Product
          </label>
          <div className="relative">
            <select
              id="plan-product-select"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
            >
              <option value="">-- No Direct Product Association --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {formatCurrency(p.sales_price)} [{p.product_type}]
                </option>
              ))}
            </select>
            {loadingProducts && (
              <div className="absolute right-3 top-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            Links subscription plan to a base catalogue product
          </p>
        </div>

        <div>
          <label htmlFor="plan-description-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            id="plan-description-input"
            rows={2}
            placeholder="Key plan entitlements, seat allowances, and SLA commitments..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* SECTION B: PRICING & CADENCE */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-sm">Section B — Pricing & Billing Cadence</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="plan-price-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Recurring Price *
            </label>
            <input
              id="plan-price-input"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold ${
                errors.price ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
          </div>

          <div>
            <label htmlFor="plan-currency-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Currency
            </label>
            <select
              id="plan-currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="plan-interval-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Billing Interval *
            </label>
            <select
              id="plan-interval-select"
              value={billingInterval}
              onChange={(e) => setBillingInterval(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium ${
                errors.billing_interval ? 'border-red-500' : 'border-slate-300'
              }`}
            >
              {SUPPORTED_BILLING_INTERVALS.map((intv) => (
                <option key={intv} value={intv}>
                  {intv.charAt(0).toUpperCase() + intv.slice(1)}
                </option>
              ))}
            </select>
            {errors.billing_interval && (
              <p className="text-xs text-red-600 mt-1">{errors.billing_interval}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="plan-interval-count-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Interval Count (Cadence)
            </label>
            <input
              id="plan-interval-count-input"
              type="number"
              min="1"
              step="1"
              value={intervalCount}
              onChange={(e) => setIntervalCount(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.interval_count ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.interval_count && (
              <p className="text-xs text-red-600 mt-1">{errors.interval_count}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">e.g. 1 for Monthly, 3 for Quarterly</p>
          </div>

          <div>
            <label htmlFor="plan-min-qty-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Minimum Quantity
            </label>
            <input
              id="plan-min-qty-input"
              type="number"
              min="1"
              step="1"
              value={minimumQuantity}
              onChange={(e) => setMinimumQuantity(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.minimum_quantity ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.minimum_quantity && (
              <p className="text-xs text-red-600 mt-1">{errors.minimum_quantity}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Minimum seats/units required</p>
          </div>

          <div>
            <label htmlFor="plan-trial-days-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Trial Period Days
            </label>
            <input
              id="plan-trial-days-input"
              type="number"
              min="0"
              step="1"
              value={trialPeriodDays}
              onChange={(e) => setTrialPeriodDays(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.trial_period_days ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.trial_period_days && (
              <p className="text-xs text-red-600 mt-1">{errors.trial_period_days}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">0 for immediate recurring billing</p>
          </div>
        </div>

        {/* Live Cadence Banner */}
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between text-indigo-950 text-xs">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>
              <strong>Billed:</strong> {formatBillingCadence(billingInterval, intervalCount)} at{' '}
              <span className="font-semibold text-indigo-700">
                {formatCurrency(price || 0, currency)}
              </span>
            </span>
          </div>
          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200">
            Min Qty: {minimumQuantity || 1}
          </span>
        </div>
      </div>

      {/* SECTION C: AVAILABILITY DATES */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <Calendar className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-sm">Section C — Plan Availability Window</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="plan-available-from-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Available From (Optional)
            </label>
            <input
              id="plan-available-from-input"
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Start of public subscription availability</p>
          </div>

          <div>
            <label htmlFor="plan-available-until-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Available Until / Automatic Closure (Optional)
            </label>
            <input
              id="plan-available-until-input"
              type="datetime-local"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.available_until ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.available_until && (
              <p className="text-xs text-red-600 mt-1">{errors.available_until}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Plan automatically closes when this date passes</p>
          </div>
        </div>
      </div>

      {/* SECTION D: SUBSCRIPTION LIFECYCLE PERMISSIONS */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <ShieldCheck className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-sm">Section D — Subscription Lifecycle Settings</h3>
        </div>

        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-slate-800">Plan Status</p>
            <p className="text-xs text-slate-500">
              Active plans can be selected for new customer quotations and subscriptions
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg text-purple-900 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-purple-950">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Authoritative Backend Lifecycle Rules</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
            <li>
              <strong>Automatic Closure:</strong> Plans expire and close automatically when the &apos;Available Until&apos; timestamp elapses.
            </li>
            <li>
              <strong>Instant Closure:</strong> Authorized Staff and Admins can close this plan anytime via the Close action.
            </li>
            <li>
              <strong>Subscription Integrity:</strong> Existing active subscriptions remain completely unaffected when a plan is closed or deactivated.
            </li>
          </ul>
        </div>
      </div>

      {/* FORM ACTIONS */}
      <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Plan...</span>
            </span>
          ) : isEditing ? (
            'Update Subscription Plan'
          ) : (
            'Create Subscription Plan'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PlanFormModal({
  isOpen,
  onClose,
  planToEdit = null,
  onSuccess,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={planToEdit ? `Edit Subscription Plan: ${planToEdit.name}` : 'Create Subscription Plan'}
      maxWidth="max-w-3xl"
    >
      <PlanFormBody
        key={planToEdit?.id || 'new'}
        planToEdit={planToEdit}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
