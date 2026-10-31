import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { productService } from '../../services/productService';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { formatBillingCadence, isPlanExpired } from '../../utils/planAndTaxValidation';
import {
  Layers,
  Calendar,
  Package,
  ShieldCheck,
  Edit,
  PowerOff,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

export default function PlanDetailsModal({
  isOpen,
  onClose,
  plan,
  onEdit,
  onClosePlan,
  onReactivatePlan,
  canManage = true,
}) {
  const [associatedProduct, setAssociatedProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(Boolean(plan?.product_id));

  useEffect(() => {
    let isMounted = true;
    if (plan?.product_id) {
      productService
        .getProduct(plan.product_id)
        .then((prod) => {
          if (isMounted) {
            setAssociatedProduct(prod);
            setLoadingProduct(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setAssociatedProduct(null);
            setLoadingProduct(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [plan?.product_id]);

  if (!plan) return null;

  const expired = isPlanExpired(plan.available_until);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subscription Plan Overview"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-indigo-100 rounded-lg text-indigo-700 shrink-0 mt-0.5">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                  {plan.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {plan.description || 'No detailed description provided for this plan.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {plan.is_active && !expired ? (
              <Badge variant="success">Active</Badge>
            ) : expired ? (
              <Badge variant="danger">Expired</Badge>
            ) : (
              <Badge variant="default">Closed</Badge>
            )}
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Plan Price
            </span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {formatCurrency(plan.price, plan.currency || 'USD')}
            </span>
            <span className="text-[11px] text-slate-500">{plan.currency || 'USD'} recurring</span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Billing Cadence
            </span>
            <span className="text-sm font-bold text-indigo-700 mt-1 block">
              {formatBillingCadence(plan.billing_interval, plan.interval_count)}
            </span>
            <span className="text-[11px] text-slate-500">Interval count: {plan.interval_count}</span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Minimum Quantity
            </span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {plan.minimum_quantity || 1}
            </span>
            <span className="text-[11px] text-slate-500">Required seats/units</span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Trial Period
            </span>
            <span className="text-lg font-bold text-emerald-700 mt-0.5 block">
              {plan.trial_period_days ? `${plan.trial_period_days} Days` : 'None'}
            </span>
            <span className="text-[11px] text-slate-500">Free evaluation duration</span>
          </div>
        </div>

        {/* ASSOCIATED PRODUCT CARD */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
            <Package className="w-4 h-4 text-indigo-600" />
            <h4>Associated Catalogue Product</h4>
          </div>

          {loadingProduct ? (
            <p className="text-xs text-slate-400 py-2">Loading product association...</p>
          ) : associatedProduct ? (
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-slate-900">{associatedProduct.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    SKU: {associatedProduct.sku}
                  </span>
                  <Badge variant="info">{associatedProduct.product_type}</Badge>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Base Product Price</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(associatedProduct.sales_price)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-1">
              No standalone catalog product associated directly with this plan.
            </p>
          )}
        </div>

        {/* AVAILABILITY & LIFECYCLE DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
              <Calendar className="w-4 h-4 text-amber-600" />
              <h4>Plan Availability Window</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Available From:</span>
                <span className="font-medium text-slate-800">
                  {plan.available_from ? formatDate(plan.available_from) : 'Immediate (Always)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Available Until:</span>
                <span className="font-medium text-slate-800">
                  {plan.available_until ? formatDate(plan.available_until) : 'Open-Ended (No Expiry)'}
                </span>
              </div>
              {expired && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 flex items-center gap-1.5 mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Availability end date has elapsed. Plan is closed for new sales.</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <h4>Lifecycle & Renewal Policies</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Cadence Enforcement:</span>
                <span className="font-medium text-slate-800">
                  {formatBillingCadence(plan.billing_interval, plan.interval_count)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Renewal Transition:</span>
                <span className="font-medium text-slate-800">Automatic Recurring</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Immediate Closure:</span>
                <span className="font-medium text-slate-800">
                  {plan.is_active ? 'Available' : 'Plan Already Closed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AUDIT TIMESTAMPS */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Created: {formatDateTime(plan.created_at)}</span>
          <span>Last Updated: {formatDateTime(plan.updated_at)}</span>
        </div>

        {/* ACTIONS FOOTER */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Back to Catalogue
          </Button>

          {canManage && (
            <div className="flex items-center space-x-2">
              {plan.is_active ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onClosePlan?.(plan);
                  }}
                  className="text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <PowerOff className="w-4 h-4 mr-1.5 text-red-600" />
                  Close Plan
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onReactivatePlan?.(plan);
                  }}
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Reactivate Plan
                </Button>
              )}

              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onEdit?.(plan);
                }}
              >
                <Edit className="w-4 h-4 mr-1.5" />
                Edit Plan
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
