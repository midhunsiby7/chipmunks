import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatCurrency, formatDateTime, capitalize } from '../../utils/formatters';
import {
  Package,
  Layers,
  Edit,
  PowerOff,
  Power,
  Shield,
  Tag,
} from 'lucide-react';

/**
 * Product Details Modal
 *
 * @param {{
 *   product: any|null,
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onEdit?: (prod: any) => void,
 *   onToggleStatus?: (prod: any) => void,
 *   isAdmin?: boolean,
 * }} props
 */
export default function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  onEdit,
  onToggleStatus,
  isAdmin = false,
}) {
  if (!product) return null;

  const salesPrice = Number(product.sales_price) || 0;
  const costPrice = Number(product.cost_price) || 0;
  const profitMargin = salesPrice > 0 ? ((salesPrice - costPrice) / salesPrice) * 100 : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Catalogue Inspection"
      description="Inspect catalog specifications, variant pricing additions, and lifecycle status."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Header Hero Pill */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-2xs">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{product.name}</h3>
                <Badge variant={product.is_active ? 'success' : 'danger'} size="sm">
                  {product.is_active ? 'Active' : 'Deactivated'}
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                SKU: <strong className="text-slate-800">{product.sku}</strong> • Type: {capitalize(product.product_type)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(product);
                }}
                className="text-xs"
              >
                <Edit className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}

            {onToggleStatus && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleStatus(product)}
                className={`text-xs ${
                  product.is_active
                    ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                    : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                }`}
              >
                {product.is_active ? (
                  <>
                    <PowerOff className="w-3.5 h-3.5 mr-1" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5 mr-1" />
                    Reactivate
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Pricing Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Base Sales Price
            </span>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(salesPrice)}
            </p>
            <span className="text-[10px] text-slate-500">Retail Catalogue Rate</span>
          </div>

          {/* Cost Price - Strictly Admin Only */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Cost Price
              </span>
              {!isAdmin && <Shield className="w-3 h-3 text-slate-400" />}
            </div>
            <p className="text-lg font-bold text-slate-900">
              {isAdmin ? formatCurrency(costPrice) : '••••••'}
            </p>
            <span className="text-[10px] text-slate-500">
              {isAdmin ? 'Internal Acquisition' : 'Admin Restricted'}
            </span>
          </div>

          {/* Gross Margin - Strictly Admin Only */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Gross Margin
              </span>
              {!isAdmin && <Shield className="w-3 h-3 text-slate-400" />}
            </div>
            <p className="text-lg font-bold text-indigo-600">
              {isAdmin ? `${profitMargin.toFixed(1)}%` : '••••••'}
            </p>
            <span className="text-[10px] text-slate-500">
              {isAdmin ? `Profit: ${formatCurrency(salesPrice - costPrice)}` : 'Admin Restricted'}
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Configured Variants
            </span>
            <p className="text-lg font-bold text-slate-900">
              {product.variants ? product.variants.length : 0}
            </p>
            <span className="text-[10px] text-slate-500">Available Add-ons</span>
          </div>
        </div>

        {/* Description & Notes */}
        <div className="space-y-3 text-xs">
          {product.description && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                Product Description
              </span>
              <p className="text-slate-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          {isAdmin && product.internal_notes && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-1">
              <span className="font-semibold text-amber-900 uppercase tracking-wider text-[10px]">
                Internal Administrative Notes
              </span>
              <p className="text-amber-800 leading-relaxed">{product.internal_notes}</p>
            </div>
          )}
        </div>

        {/* Variants Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Configured Variants ({product.variants?.length || 0})</span>
            </div>
          </div>

          {!product.variants || product.variants.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <Tag className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="text-xs text-slate-500">No variant options configured for this product.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Variant Option</th>
                    <th className="px-3 py-2.5">Variant Code</th>
                    <th className="px-3 py-2.5">Price Addition</th>
                    <th className="px-3 py-2.5">Calculated Total</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.variants.map((v) => {
                    const diff = Number(v.price_difference) || 0;
                    const finalTotal = Number(v.price) || salesPrice + diff;
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{v.name}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{v.variant_code}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-700">
                          {diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                        </td>
                        <td className="px-3 py-2.5 font-bold text-indigo-600">
                          {formatCurrency(finalTotal)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={v.is_active ? 'success' : 'danger'} size="sm">
                            {v.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Timestamps & Identifiers */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span>Product UUID:</span>
            <span className="font-mono text-[11px] text-slate-700">{product.id}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>Created Date:</span>
            <span className="text-slate-700">{formatDateTime(product.created_at)}</span>
          </div>
          {product.updated_at && (
            <div className="flex items-center justify-between text-slate-500">
              <span>Last Modified:</span>
              <span className="text-slate-700">{formatDateTime(product.updated_at)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
