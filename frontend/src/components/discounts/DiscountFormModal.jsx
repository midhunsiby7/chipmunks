import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { discountService } from '../../services/discountService';
import { productService } from '../../services/productService';
import { planService } from '../../services/planService';
import {
  validateDiscountPayload,
  DISCOUNT_TYPES,
} from '../../utils/discountValidation';
import {
  Tag,
  Percent,
  IndianRupee,
  Calendar,
  AlertCircle,
  Loader2,
  Package,
  Layers,
  Hash,
  ShoppingBag,
  Sliders,
} from 'lucide-react';

function DiscountFormBody({
  discountToEdit = null,
  onClose,
  onSuccess,
}) {
  const isEditing = Boolean(discountToEdit);

  // Form state
  const [code, setCode] = useState(() => discountToEdit?.code || '');
  const [description, setDescription] = useState(() => discountToEdit?.description || '');
  const [discountType, setDiscountType] = useState(
    () => discountToEdit?.discount_type || DISCOUNT_TYPES.PERCENTAGE
  );
  const [value, setValue] = useState(() =>
    discountToEdit?.value !== undefined ? String(discountToEdit.value) : ''
  );
  const [minimumPurchase, setMinimumPurchase] = useState(() =>
    discountToEdit?.minimum_purchase_amount !== undefined
      ? String(discountToEdit.minimum_purchase_amount)
      : '0.00'
  );
  const [minimumQuantity, setMinimumQuantity] = useState(() =>
    discountToEdit?.minimum_quantity !== undefined ? String(discountToEdit.minimum_quantity) : '1'
  );

  // Scope selection
  const [scopeType, setScopeType] = useState(() => {
    if (discountToEdit?.applicable_product_id) return 'product';
    if (discountToEdit?.applicable_plan_id) return 'plan';
    return 'global';
  });
  const [productId, setProductId] = useState(() => discountToEdit?.applicable_product_id || '');
  const [planId, setPlanId] = useState(() => discountToEdit?.applicable_plan_id || '');

  // Validity dates
  const [validFrom, setValidFrom] = useState(() => {
    if (discountToEdit?.valid_from) {
      try {
        return new Date(discountToEdit.valid_from).toISOString().slice(0, 16);
      } catch {
        return '';
      }
    }
    return new Date().toISOString().slice(0, 16);
  });

  const [validUntil, setValidUntil] = useState(() => {
    if (discountToEdit?.valid_until) {
      try {
        return new Date(discountToEdit.valid_until).toISOString().slice(0, 16);
      } catch {
        return '';
      }
    }
    return '';
  });

  // Redemption cap
  const [hasRedemptionLimit, setHasRedemptionLimit] = useState(() =>
    Boolean(discountToEdit?.max_redemptions)
  );
  const [maxRedemptions, setMaxRedemptions] = useState(() =>
    discountToEdit?.max_redemptions ? String(discountToEdit.max_redemptions) : ''
  );

  const [isActive, setIsActive] = useState(() =>
    discountToEdit?.is_active !== undefined ? discountToEdit.is_active : true
  );

  // Dynamic references (products and plans)
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // Submission state
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      productService.getProducts({ pageSize: 100 }),
      planService.listPlans({ pageSize: 100 }),
    ]).then(([prodRes, planRes]) => {
      if (!isMounted) return;

      if (prodRes.status === 'fulfilled' && prodRes.value?.items) {
        setProducts(prodRes.value.items);
      }
      if (planRes.status === 'fulfilled' && planRes.value?.items) {
        setPlans(planRes.value.items);
      }
      setLoadingRefs(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    let validFromIso = null;
    if (validFrom) {
      try {
        validFromIso = new Date(validFrom).toISOString();
      } catch {
        validFromIso = validFrom;
      }
    }

    let validUntilIso = null;
    if (validUntil) {
      try {
        validUntilIso = new Date(validUntil).toISOString();
      } catch {
        validUntilIso = validUntil;
      }
    }

    const payload = {
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      discount_type: discountType,
      value: parseFloat(value),
      minimum_purchase_amount: minimumPurchase ? parseFloat(minimumPurchase) : 0,
      minimum_quantity: minimumQuantity ? parseInt(minimumQuantity, 10) : 1,
      valid_from: validFromIso,
      valid_until: validUntilIso,
      max_redemptions: hasRedemptionLimit && maxRedemptions ? parseInt(maxRedemptions, 10) : null,
      applicable_product_id: scopeType === 'product' && productId ? productId : null,
      applicable_plan_id: scopeType === 'plan' && planId ? planId : null,
      is_active: isActive,
    };

    const validation = validateDiscountPayload(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      if (isEditing) {
        await discountService.updateDiscount(discountToEdit.id, payload);
      } else {
        await discountService.createDiscount(payload);
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
        'Failed to save discount. Please check input parameters and retry.';
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

      {/* SECTION 1: CODE & TYPE */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Tag className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Promotional Code & Deduction Mechanism</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="discount-code-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Coupon / Discount Code *
            </label>
            <input
              id="discount-code-input"
              type="text"
              required
              maxLength={50}
              placeholder="e.g. WELCOME20, FESTIVE500"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 text-sm font-mono uppercase bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.code ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
              }`}
            />
            {errors.code ? (
              <p className="text-xs text-red-600 mt-1">{errors.code}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Unique identifier customers or sales agents submit at checkout.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Discount Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType(DISCOUNT_TYPES.PERCENTAGE)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  discountType === DISCOUNT_TYPES.PERCENTAGE
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Percentage (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setDiscountType(DISCOUNT_TYPES.FIXED_AMOUNT)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  discountType === DISCOUNT_TYPES.FIXED_AMOUNT
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Fixed Amount (₹)</span>
              </button>
            </div>
            {errors.discount_type && (
              <p className="text-xs text-red-600 mt-1">{errors.discount_type}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="discount-value-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {discountType === DISCOUNT_TYPES.PERCENTAGE ? 'Discount Rate (%) *' : 'Deduction Amount (₹) *'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                {discountType === DISCOUNT_TYPES.PERCENTAGE ? (
                  <Percent className="w-4 h-4" />
                ) : (
                  <IndianRupee className="w-4 h-4" />
                )}
              </div>
              <input
                id="discount-value-input"
                type="number"
                min="0.01"
                step={discountType === DISCOUNT_TYPES.PERCENTAGE ? '0.1' : '0.01'}
                max={discountType === DISCOUNT_TYPES.PERCENTAGE ? '100' : undefined}
                required
                placeholder={discountType === DISCOUNT_TYPES.PERCENTAGE ? '20' : '500.00'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm font-semibold bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.value ? 'border-red-500 bg-red-50/20' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.value ? (
              <p className="text-xs text-red-600 mt-1">{errors.value}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                {discountType === DISCOUNT_TYPES.PERCENTAGE
                  ? 'Calculates percentage deduction of invoice subtotal (1% - 100%).'
                  : 'Subtracts fixed rupee amount up to total purchase subtotal.'}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="discount-desc-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Promotion Campaign
            </label>
            <input
              id="discount-desc-input"
              type="text"
              maxLength={255}
              placeholder="e.g. Early adopter subscription incentive"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.description ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-1">{errors.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: QUALIFYING THRESHOLDS & APPLICABILITY */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Sliders className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Eligibility Thresholds & Scope</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="discount-min-purchase" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Minimum Purchase Amount (₹)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <IndianRupee className="w-4 h-4" />
              </div>
              <input
                id="discount-min-purchase"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={minimumPurchase}
                onChange={(e) => setMinimumPurchase(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.minimum_purchase_amount ? 'border-red-500' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.minimum_purchase_amount ? (
              <p className="text-xs text-red-600 mt-1">{errors.minimum_purchase_amount}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Order subtotal must reach or exceed this amount to unlock promo.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="discount-min-qty" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Minimum Quantity
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <input
                id="discount-min-qty"
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.minimum_quantity ? 'border-red-500' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.minimum_quantity ? (
              <p className="text-xs text-red-600 mt-1">{errors.minimum_quantity}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Minimum total line item units or subscription seat count.
              </p>
            )}
          </div>
        </div>

        {/* Applicability Scope */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Applicability Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setScopeType('global');
                setProductId('');
                setPlanId('');
              }}
              className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left ${
                scopeType === 'global'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-slate-500" />
              <span>Entire Order / Global</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScopeType('product');
                setPlanId('');
              }}
              className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left ${
                scopeType === 'product'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4 text-slate-500" />
              <span>Specific Product</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScopeType('plan');
                setProductId('');
              }}
              className={`flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-left ${
                scopeType === 'plan'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Specific Subscription Plan</span>
            </button>
          </div>

          {scopeType === 'product' && (
            <div className="mt-2">
              <label htmlFor="discount-product-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Select Qualifying Product *
              </label>
              <select
                id="discount-product-select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose target product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku || 'No SKU'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {scopeType === 'plan' && (
            <div className="mt-2">
              <label htmlFor="discount-plan-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Select Qualifying Subscription Plan *
              </label>
              <select
                id="discount-plan-select"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose target subscription plan --</option>
                {plans.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} ({pl.code}) — ₹{pl.price} / {pl.billing_interval}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: VALIDITY WINDOW & USAGE CEILING */}
      <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800 pb-2 border-b border-slate-200">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Campaign Validity & Redemption Cap</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="discount-valid-from" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Valid From (Start Date/Time) *
            </label>
            <input
              id="discount-valid-from"
              type="datetime-local"
              required
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.valid_from ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.valid_from && (
              <p className="text-xs text-red-600 mt-1">{errors.valid_from}</p>
            )}
          </div>

          <div>
            <label htmlFor="discount-valid-until" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Valid Until (Expiration Date/Time)
            </label>
            <input
              id="discount-valid-until"
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.valid_until ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.valid_until ? (
              <p className="text-xs text-red-600 mt-1">{errors.valid_until}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Leave empty for an evergreen discount without automatic expiration.
              </p>
            )}
          </div>
        </div>

        {/* Max Redemptions Ceiling */}
        <div className="pt-2 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Usage Ceiling (Redemption Cap)
              </span>
              <p className="text-[11px] text-slate-500">
                Limit how many times this promotion may be redeemed across all customers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hasRedemptionLimit}
                onChange={(e) => setHasRedemptionLimit(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {hasRedemptionLimit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label htmlFor="discount-max-redemptions" className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Total Redemptions *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    id="discount-max-redemptions"
                    type="number"
                    min="1"
                    step="1"
                    required={hasRedemptionLimit}
                    placeholder="e.g. 100"
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.max_redemptions ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.max_redemptions && (
                  <p className="text-xs text-red-600 mt-1">{errors.max_redemptions}</p>
                )}
              </div>

              {isEditing && discountToEdit?.current_redemptions !== undefined && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-center">
                  <span className="text-xs text-slate-500">Current Redemptions</span>
                  <span className="text-base font-bold text-slate-800">
                    {discountToEdit.current_redemptions} / {maxRedemptions || '∞'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Toggle */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              Active Status
            </span>
            <p className="text-[11px] text-slate-500">
              Disabling will immediately reject coupon validation during checkout or quotation.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
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
              <span>Saving...</span>
            </span>
          ) : isEditing ? (
            'Update Discount'
          ) : (
            'Create Promotional Code'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function DiscountFormModal({
  isOpen,
  onClose,
  onSuccess,
  discountToEdit = null,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={discountToEdit ? `Edit Discount: ${discountToEdit.code}` : 'Create Promotional Discount'}
      size="lg"
    >
      <DiscountFormBody
        key={discountToEdit?.id || 'new-discount'}
        discountToEdit={discountToEdit}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
