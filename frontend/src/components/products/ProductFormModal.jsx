import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { productService } from '../../services/productService';
import { formatCurrency } from '../../utils/formatters';
import {
  calculateVariantPrice,
  isValidPrice,
  validateVariants,
} from '../../utils/productPricing';
import {
  Package,
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Tag,
  Info,
  Shield,
} from 'lucide-react';

const PRODUCT_TYPES = [
  { value: 'service', label: 'Service / SaaS' },
  { value: 'digital', label: 'Digital Product' },
  { value: 'physical', label: 'Physical Good' },
];

function ProductFormBody({
  productToEdit = null,
  isAdmin = false,
  onClose,
  onSuccess,
}) {
  const isEditing = Boolean(productToEdit);

  // Directly initialize state from productToEdit without cascading setState effects
  const [name, setName] = useState(() => productToEdit?.name || '');
  const [sku, setSku] = useState(() => productToEdit?.sku || '');
  const [productType, setProductType] = useState(() => productToEdit?.product_type || 'service');
  const [salesPrice, setSalesPrice] = useState(() =>
    productToEdit?.sales_price !== undefined ? String(productToEdit.sales_price) : ''
  );
  const [costPrice, setCostPrice] = useState(() =>
    productToEdit?.cost_price !== undefined ? String(productToEdit.cost_price) : ''
  );
  const [description, setDescription] = useState(() => productToEdit?.description || '');
  const [internalNotes, setInternalNotes] = useState(() => productToEdit?.internal_notes || '');
  const [isActive, setIsActive] = useState(() =>
    productToEdit?.is_active !== undefined ? productToEdit.is_active : true
  );

  const [variants, setVariants] = useState(() => {
    if (productToEdit?.variants && productToEdit.variants.length > 0) {
      return productToEdit.variants.map((v) => ({
        id: v.id,
        name: v.name,
        variant_code: v.variant_code,
        price_difference: v.price_difference !== undefined ? String(v.price_difference) : '0',
        price: v.price !== undefined ? String(v.price) : '0',
        is_active: v.is_active !== undefined ? v.is_active : true,
      }));
    }
    return [];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  // Variant Helpers
  const addVariantRow = () => {
    const nextIndex = variants.length + 1;
    const baseSku = sku ? sku.trim().toUpperCase() : 'PROD';
    setVariants((prev) => [
      ...prev,
      {
        name: `Option ${nextIndex}`,
        variant_code: `${baseSku}-VAR${nextIndex}`,
        price_difference: '0',
        price: salesPrice ? String(salesPrice) : '0',
        is_active: true,
      },
    ]);
  };

  const updateVariantRow = (index, field, value) => {
    setVariants((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      if (field === 'price_difference') {
        const calculated = calculateVariantPrice(salesPrice || 0, value || 0);
        target.price = String(calculated);
      }
      updated[index] = target;
      return updated;
    });
  };

  const removeVariantRow = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errs = [];

    if (!name.trim()) errs.push('Product name is required.');
    if (!sku.trim()) errs.push('Product SKU is required.');
    if (!isValidPrice(salesPrice)) errs.push('Sales price must be a valid non-negative number.');

    if (isAdmin && costPrice !== '' && !isValidPrice(costPrice)) {
      errs.push('Cost price must be a valid non-negative number.');
    }

    if (variants.length > 0) {
      const variantValidation = validateVariants(variants);
      if (!variantValidation.isValid) {
        errs.push(...variantValidation.errors);
      }
    }

    setValidationErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const basePayload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        product_type: productType,
        sales_price: Number(salesPrice),
        cost_price: isAdmin && costPrice !== '' ? Number(costPrice) : 0,
        description: description.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
        is_active: isActive,
      };

      if (isEditing) {
        await productService.updateProduct(productToEdit.id, basePayload);

        for (const v of variants) {
          if (!v.id) {
            const finalPrice = calculateVariantPrice(salesPrice, v.price_difference);
            await productService.createVariant(productToEdit.id, {
              name: v.name,
              variant_code: v.variant_code,
              price_difference: Number(v.price_difference) || 0,
              price: finalPrice,
              is_active: v.is_active,
            });
          }
        }
      } else {
        const variantsPayload = variants.map((v) => {
          const finalPrice = calculateVariantPrice(salesPrice, v.price_difference);
          return {
            name: v.name,
            variant_code: v.variant_code,
            price_difference: Number(v.price_difference) || 0,
            price: finalPrice,
            is_active: v.is_active,
          };
        });

        await productService.createProduct({
          ...basePayload,
          variants: variantsPayload.length > 0 ? variantsPayload : undefined,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('[Brightloop ProductFormModal] Save error:', err);
      setErrorMessage(
        err.detail || err.message || 'Failed to save product. Please verify inputs and SKU uniqueness.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Messages */}
      {(errorMessage || validationErrors.length > 0) && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-800">
          <div className="flex items-center gap-1.5 font-semibold text-rose-900">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Please resolve the following:</span>
          </div>
          {errorMessage && <p>{errorMessage}</p>}
          {validationErrors.map((err, idx) => (
            <p key={idx} className="pl-5 list-disc">• {err}</p>
          ))}
        </div>
      )}

      {/* Section 1: Basic Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Package className="w-4 h-4 text-indigo-600" />
          <span>Product Specifications</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prod-name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="prod-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enterprise Subscription Engine"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="prod-sku" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              SKU / Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              id="prod-sku"
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SW-ENTERPRISE-01"
              className="w-full text-sm font-mono uppercase rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="prod-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Product Type <span className="text-rose-500">*</span>
            </label>
            <select
              id="prod-type"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="prod-price" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Base Sales Price (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-slate-400 font-semibold">₹</span>
              <input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                placeholder="2000.00"
                className="w-full text-sm rounded-lg border border-slate-300 pl-8 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="prod-cost" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Cost Price (₹)
              </label>
              {!isAdmin && (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Shield className="w-3 h-3 text-slate-400" /> Admin Only
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm text-slate-400 font-semibold">₹</span>
              <input
                id="prod-cost"
                type="number"
                step="0.01"
                min="0"
                disabled={!isAdmin}
                value={isAdmin ? costPrice : ''}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder={isAdmin ? '800.00' : 'Confidential'}
                className={`w-full text-sm rounded-lg border pl-8 pr-3 py-2 ${
                  isAdmin
                    ? 'border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="prod-desc" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description <span className="text-slate-400 text-[10px] font-normal">(Client Facing)</span>
          </label>
          <textarea
            id="prod-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enterprise-grade subscription management engine with automated invoice schedules..."
            className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {isAdmin && (
          <div>
            <label htmlFor="prod-notes" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Internal Notes <span className="text-slate-400 text-[10px] font-normal">(Admin Only)</span>
            </label>
            <textarea
              id="prod-notes"
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Procurement notes, licensing margins, or partner SLA commitments..."
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Section 2: Variant Pricing & Options */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Product Variants & Additive Pricing ({variants.length})</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariantRow}
            className="text-xs py-1 px-2.5 h-auto text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Variant Option
          </Button>
        </div>

        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Additive Pricing Engine:</span>
          </div>
          <p className="text-[11px] text-indigo-800 leading-relaxed">
            Define product tiers, brands, or seat additions. Each variant's final price is computed automatically as:
            <strong className="block mt-0.5 text-indigo-950 font-mono text-xs">
              Final Variant Price = Base Sales Price ({formatCurrency(salesPrice || 0)}) + Additional Price
            </strong>
          </p>
        </div>

        {variants.length === 0 ? (
          <div className="py-6 px-4 rounded-xl border border-dashed border-slate-200 text-center space-y-1 bg-slate-50/50">
            <Tag className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No Product Variants Configured</p>
            <p className="text-[11px] text-slate-400">
              This item sells at the base price. Click "Add Variant Option" to configure brand, tier, or license variants.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((v, idx) => {
              const finalPreview = calculateVariantPrice(salesPrice || 0, v.price_difference || 0);
              return (
                <div
                  key={v.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Variant Option #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVariantRow(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Remove Variant"
                      aria-label="Remove Variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Option Name
                      </label>
                      <input
                        type="text"
                        required
                        value={v.name}
                        onChange={(e) => updateVariantRow(idx, 'name', e.target.value)}
                        placeholder="Brand: Odoo"
                        className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Variant Code
                      </label>
                      <input
                        type="text"
                        required
                        value={v.variant_code}
                        onChange={(e) => updateVariantRow(idx, 'variant_code', e.target.value)}
                        placeholder="VAR-ODOO"
                        className="w-full text-xs font-mono uppercase rounded-lg border border-slate-300 px-2.5 py-1.5 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Price Addition (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-semibold">+₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={v.price_difference}
                          onChange={(e) => updateVariantRow(idx, 'price_difference', e.target.value)}
                          placeholder="560.00"
                          className="w-full text-xs rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Preview: Base ({formatCurrency(salesPrice || 0)}) + Addition ({formatCurrency(v.price_difference || 0)})
                    </span>
                    <span className="font-bold text-slate-900">
                      Final Price: <span className="text-indigo-600">{formatCurrency(finalPreview)}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Status & Visibility */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
          <span className="text-xs font-semibold text-slate-800">
            Active in Product Catalog
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              Saving Product...
            </>
          ) : isEditing ? (
            'Save Product Changes'
          ) : (
            'Create Product'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function ProductFormModal({
  isOpen,
  onClose,
  productToEdit = null,
  isAdmin = false,
  onSuccess,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? `Edit Product: ${productToEdit.name}` : 'Create Catalog Product'}
      description="Configure product specifications, catalog pricing, and variant tiers."
      maxWidth="2xl"
    >
      <ProductFormBody
        key={productToEdit?.id || 'new-product'}
        productToEdit={productToEdit}
        isAdmin={isAdmin}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
