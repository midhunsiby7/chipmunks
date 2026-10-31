import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { taxService } from '../../services/taxService';
import { formatCurrency } from '../../utils/formatters';
import {
  validateTaxPayload,
  calculateTaxPreview,
} from '../../utils/planAndTaxValidation';
import {
  Percent,
  Calculator,
  Calendar,
  AlertCircle,
  Loader2,
  Globe,
  Info,
} from 'lucide-react';

function TaxFormBody({
  taxToEdit = null,
  onClose,
  onSuccess,
}) {
  const isEditing = Boolean(taxToEdit);

  // Directly initialize state from props
  const [name, setName] = useState(() => taxToEdit?.name || '');
  const [taxCode, setTaxCode] = useState(() => taxToEdit?.tax_code || '');
  const [ratePercentage, setRatePercentage] = useState(() =>
    taxToEdit?.rate_percentage !== undefined ? String(taxToEdit.rate_percentage) : ''
  );
  const [isFixed, setIsFixed] = useState(() =>
    taxToEdit?.is_fixed !== undefined ? taxToEdit.is_fixed : false
  );
  const [countryCode, setCountryCode] = useState(() => taxToEdit?.country_code || 'IN');
  const [stateOrRegion, setStateOrRegion] = useState(() => taxToEdit?.state_or_region || '');
  const [effectiveFrom, setEffectiveFrom] = useState(() => {
    if (taxToEdit?.effective_from) {
      try {
        return new Date(taxToEdit.effective_from).toISOString().slice(0, 16);
      } catch {
        return '';
      }
    }
    return '';
  });
  const [effectiveUntil, setEffectiveUntil] = useState(() => {
    if (taxToEdit?.effective_until) {
      try {
        return new Date(taxToEdit.effective_until).toISOString().slice(0, 16);
      } catch {
        return '';
      }
    }
    return '';
  });
  const [isActive, setIsActive] = useState(() =>
    taxToEdit?.is_active !== undefined ? taxToEdit.is_active : true
  );

  // Sample amount for live tax preview
  const [previewBaseAmount, setPreviewBaseAmount] = useState('1000');

  // Submission & validation state
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate live preview using confirmed backend logic
  const previewResult = calculateTaxPreview(previewBaseAmount, {
    rate_percentage: ratePercentage,
    is_fixed: isFixed,
    is_active: isActive,
    effective_from: effectiveFrom || null,
    effective_until: effectiveUntil || null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const payload = {
      name,
      tax_code: taxCode,
      rate_percentage: ratePercentage,
      is_fixed: isFixed,
      country_code: countryCode,
      state_or_region: stateOrRegion || null,
      effective_from: effectiveFrom || null,
      effective_until: effectiveUntil || null,
      is_active: isActive,
    };

    const validation = validateTaxPayload(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      if (isEditing) {
        await taxService.updateTaxRule(taxToEdit.id, payload);
      } else {
        await taxService.createTaxRule(payload);
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
        'Failed to save tax rule. Please verify inputs and retry.';
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
            <p className="font-semibold">Tax Rule Submission Error</p>
            <p className="mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {/* SECTION 1: RULE IDENTIFIERS & JURISDICTION */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-sm">Jurisdiction & Rule Identifiers</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tax-name-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tax Rule Name *
            </label>
            <input
              id="tax-name-input"
              type="text"
              required
              placeholder="e.g. GST Standard 18% or California Sales Tax"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="tax-code-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tax Code (Unique) *
            </label>
            <input
              id="tax-code-input"
              type="text"
              required
              placeholder="e.g. GST-18 or TAX-CA-9"
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 text-sm font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.tax_code ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.tax_code && <p className="text-xs text-red-600 mt-1">{errors.tax_code}</p>}
            <p className="text-[11px] text-slate-500 mt-1">Unique tax accounting code</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tax-country-code-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Country Code (2 Letters) *
            </label>
            <input
              id="tax-country-code-input"
              type="text"
              maxLength={2}
              required
              placeholder="IN, US, GB, etc."
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 text-sm font-mono uppercase bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.country_code ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.country_code && (
              <p className="text-xs text-red-600 mt-1">{errors.country_code}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">ISO 3166-1 alpha-2 country code</p>
          </div>

          <div>
            <label htmlFor="tax-state-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              State or Region (Optional)
            </label>
            <input
              id="tax-state-input"
              type="text"
              placeholder="e.g. Karnataka, Maharashtra, California"
              value={stateOrRegion}
              onChange={(e) => setStateOrRegion(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">For state-level or regional levies</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: RATE & COMPUTATION TYPE */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <Percent className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-sm">Tax Rate & Calculation Type</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tax-rate-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Rate Value {isFixed ? '(Fixed Amount ₹)' : '(Percentage %)'} *
            </label>
            <input
              id="tax-rate-input"
              type="number"
              step="0.01"
              min="0"
              max={isFixed ? undefined : 100}
              required
              placeholder={isFixed ? '50.00' : '18.00'}
              value={ratePercentage}
              onChange={(e) => setRatePercentage(e.target.value)}
              className={`w-full px-3 py-2 text-sm font-semibold bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.rate_percentage ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.rate_percentage && (
              <p className="text-xs text-red-600 mt-1">{errors.rate_percentage}</p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              {isFixed
                ? 'Applies as a flat amount to each invoice line'
                : 'Applies as a percentage between 0.00% and 100.00%'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Calculation Treatment
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsFixed(false)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  !isFixed
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Percentage Rate (%)
              </button>
              <button
                type="button"
                onClick={() => setIsFixed(true)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  isFixed
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Fixed Fee Amount
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: APPLICABILITY WINDOW & ACTIVE STATUS */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 text-slate-800">
          <Calendar className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-sm">Effective Date Window</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tax-effective-from-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Effective From (Optional)
            </label>
            <input
              id="tax-effective-from-input"
              type="datetime-local"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="tax-effective-until-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Effective Until (Optional)
            </label>
            <input
              id="tax-effective-until-input"
              type="datetime-local"
              value={effectiveUntil}
              onChange={(e) => setEffectiveUntil(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.effective_until ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {errors.effective_until && (
              <p className="text-xs text-red-600 mt-1">{errors.effective_until}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-slate-800">Active Rule</p>
            <p className="text-xs text-slate-500">
              Only active tax rules are applied during checkout and invoice generation
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
      </div>

      {/* SECTION 4: INTERACTIVE TAX PREVIEW BOX */}
      <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-indigo-900 font-semibold text-sm">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>Interactive Tax Engine Preview</span>
          </div>
          <span className="text-[11px] font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">
            Client Preview (Deterministic Rounding)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="tax-test-amount-input" className="block text-xs font-semibold text-indigo-900 mb-1">
              Sample Subtotal (₹)
            </label>
            <input
              id="tax-test-amount-input"
              type="number"
              min="0"
              step="10"
              value={previewBaseAmount}
              onChange={(e) => setPreviewBaseAmount(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-2 bg-white rounded-lg border border-indigo-100">
            <span className="text-[11px] text-slate-500 block">Applied Rate:</span>
            <span className="text-sm font-bold text-slate-800">
              {ratePercentage ? (isFixed ? `₹${ratePercentage} flat` : `${ratePercentage}%`) : '0%'}
            </span>
          </div>

          <div className="p-2 bg-white rounded-lg border border-indigo-100">
            <span className="text-[11px] text-slate-500 block">Tax Liability:</span>
            <span className="text-sm font-bold text-indigo-700">
              {formatCurrency(previewResult.taxAmount)}
            </span>
          </div>

          <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
            <span className="text-[11px] text-indigo-200 block">Total with Tax:</span>
            <span className="text-sm font-bold">
              {formatCurrency(previewResult.totalWithTax)}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-indigo-800/80 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          Standalone preview API endpoint is internal. Calculations are mirrored client-side and verified by backend invoice generation.
        </p>
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
              <span>Saving Tax Rule...</span>
            </span>
          ) : isEditing ? (
            'Update Tax Rule'
          ) : (
            'Create Tax Rule'
          )}
        </Button>
      </div>
    </form>
  );
}

export default function TaxFormModal({
  isOpen,
  onClose,
  taxToEdit = null,
  onSuccess,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taxToEdit ? `Edit Tax Rule: ${taxToEdit.name}` : 'Create Tax Rule'}
      maxWidth="max-w-2xl"
    >
      <TaxFormBody
        key={taxToEdit?.id || 'new'}
        taxToEdit={taxToEdit}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Modal>
  );
}
