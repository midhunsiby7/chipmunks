import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  formatDiscountValue,
  getDiscountStatus,
  isDiscountExpired,
  DISCOUNT_TYPES,
} from '../../utils/discountValidation';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  Tag,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  ShoppingBag,
  Sliders,
  Copy,
  Check,
  Edit,
  Power,
  ShieldCheck,
} from 'lucide-react';

export default function DiscountDetailsModal({
  isOpen,
  onClose,
  discount,
  onEdit,
  onToggleActive,
}) {
  const [copied, setCopied] = useState(false);

  if (!discount) return null;

  const status = getDiscountStatus(discount);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(discount.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentRedemptions = discount.current_redemptions || 0;
  const maxRedemptions = discount.max_redemptions;
  const redemptionPercentage = maxRedemptions
    ? Math.min(100, Math.round((currentRedemptions / maxRedemptions) * 100))
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-lg font-bold text-slate-900 tracking-wider">
              {discount.code}
            </span>
            <span className="block text-xs font-normal text-slate-500">
              {discount.description || 'Promotional coupon code'}
            </span>
          </div>
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* TOP STATUS BAR & PROMO CARD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-purple-50/50 rounded-xl border border-indigo-100">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Discount Deduction
            </span>
            <div className="text-2xl font-black text-indigo-700 flex items-center gap-1.5 mt-0.5">
              {formatDiscountValue(discount.discount_type, discount.value)}
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {discount.discount_type === DISCOUNT_TYPES.PERCENTAGE ? 'Percentage Off' : 'Flat Off'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Copy promo code"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                status.color === 'emerald'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : status.color === 'amber'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : status.color === 'red'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : status.color === 'blue'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status.color === 'emerald'
                    ? 'bg-emerald-500'
                    : status.color === 'amber'
                    ? 'bg-amber-500'
                    : status.color === 'red'
                    ? 'bg-red-500'
                    : status.color === 'blue'
                    ? 'bg-blue-500'
                    : 'bg-slate-400'
                }`}
              />
              <span>{status.label}</span>
            </span>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase">
              <ShoppingBag className="w-4 h-4 text-indigo-500" />
              <span>Min Spend</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">
              {parseFloat(discount.minimum_purchase_amount || 0) > 0
                ? formatCurrency(discount.minimum_purchase_amount)
                : 'No Minimum'}
            </div>
            <span className="text-[11px] text-slate-400">Order subtotal threshold</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase">
              <Sliders className="w-4 h-4 text-purple-500" />
              <span>Min Quantity</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">
              {discount.minimum_quantity || 1} {Number(discount.minimum_quantity) === 1 ? 'Item' : 'Items'}
            </div>
            <span className="text-[11px] text-slate-400">Minimum line item count</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold uppercase">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Redemptions</span>
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">
              {currentRedemptions} {maxRedemptions ? `/ ${maxRedemptions}` : '(Unlimited)'}
            </div>
            {maxRedemptions && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    redemptionPercentage >= 100
                      ? 'bg-amber-500'
                      : redemptionPercentage >= 80
                      ? 'bg-indigo-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${redemptionPercentage}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="space-y-4">
          {/* Applicability Scope Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Applicability Scope
            </span>
            {discount.applicable_product_id ? (
              <div className="flex items-center space-x-2.5 text-sm text-slate-800">
                <Package className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold">Restricted to Product ID:</span>
                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                  {discount.applicable_product_id}
                </span>
              </div>
            ) : discount.applicable_plan_id ? (
              <div className="flex items-center space-x-2.5 text-sm text-slate-800">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold">Restricted to Subscription Plan ID:</span>
                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                  {discount.applicable_plan_id}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2.5 text-sm text-emerald-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">Global Promotion:</span>
                <span className="text-slate-600 text-xs">
                  Applies to all products, variants, and subscription plans across Brightloop.
                </span>
              </div>
            )}
          </div>

          {/* Campaign Validity Window */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Validity Window
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2 text-slate-700">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">Valid From:</span>
                <span className="font-medium text-xs">
                  {discount.valid_from ? formatDateTime(discount.valid_from) : 'Immediate'}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">Valid Until:</span>
                <span className="font-medium text-xs">
                  {discount.valid_until ? (
                    <span
                      className={
                        isDiscountExpired(discount.valid_until)
                          ? 'text-red-600 font-semibold'
                          : 'text-slate-700'
                      }
                    >
                      {formatDateTime(discount.valid_until)}
                    </span>
                  ) : (
                    'Evergreen (No Expiry)'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Metadata */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-200">
            <span>Created: {discount.created_at ? formatDateTime(discount.created_at) : '—'}</span>
            <span>Updated: {discount.updated_at ? formatDateTime(discount.updated_at) : '—'}</span>
          </div>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button
            variant="secondary"
            onClick={() => onToggleActive?.(discount)}
            className="flex items-center space-x-1.5 text-xs"
          >
            <Power className="w-3.5 h-3.5" />
            <span>{discount.is_active ? 'Deactivate Discount' : 'Reactivate Discount'}</span>
          </Button>

          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onEdit?.(discount);
              }}
              className="flex items-center space-x-1.5 text-xs"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Discount</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
