import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { calculateTaxPreview } from '../../utils/planAndTaxValidation';
import {
  Percent,
  Calculator,
  Globe,
  Edit,
  PowerOff,
  RotateCcw,
} from 'lucide-react';

export default function TaxDetailsModal({
  isOpen,
  onClose,
  taxRule,
  onEdit,
  onDeactivate,
  onReactivate,
  canManage = true,
}) {
  const [testAmount, setTestAmount] = useState('1000');

  if (!taxRule) return null;

  const preview = calculateTaxPreview(testAmount, taxRule);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tax Rule Specification"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 mt-0.5">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{taxRule.name}</h3>
                <span className="font-mono text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold">
                  {taxRule.tax_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {taxRule.is_fixed
                  ? 'Fixed fee assessment applied per transaction'
                  : 'Proportional rate levied on subtotal amount'}
              </p>
            </div>
          </div>
          <div>
            {taxRule.is_active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="default">Inactive</Badge>
            )}
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Levy Assessment
            </span>
            <span className="text-lg font-bold text-emerald-700 mt-0.5 block">
              {taxRule.is_fixed ? formatCurrency(taxRule.rate_percentage) : `${taxRule.rate_percentage}%`}
            </span>
            <span className="text-[11px] text-slate-500">
              {taxRule.is_fixed ? 'Flat Fixed Fee' : 'Percentage Rate'}
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Jurisdiction
            </span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-indigo-500" />
              {taxRule.country_code}
            </span>
            <span className="text-[11px] text-slate-500">
              {taxRule.state_or_region || 'National Rule'}
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm col-span-2 md:col-span-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Validity Window
            </span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">
              {taxRule.effective_from ? formatDate(taxRule.effective_from) : 'Immediate'}
              {' → '}
              {taxRule.effective_until ? formatDate(taxRule.effective_until) : 'Indefinite'}
            </span>
            <span className="text-[11px] text-slate-500">Effective calendar period</span>
          </div>
        </div>

        {/* INTERACTIVE CALCULATION PREVIEW */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
          <div className="flex items-center space-x-2 text-indigo-900 font-semibold text-sm">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>Interactive Calculation Verification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label htmlFor="tax-details-amount-input" className="block text-xs font-semibold text-indigo-900 mb-1">
                Subtotal (₹)
              </label>
              <input
                id="tax-details-amount-input"
                type="number"
                min="0"
                step="50"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="p-2 bg-white rounded-lg border border-indigo-100">
              <span className="text-[11px] text-slate-500 block">Rate Applied:</span>
              <span className="text-sm font-bold text-slate-800">
                {taxRule.is_fixed ? `₹${taxRule.rate_percentage} Flat` : `${taxRule.rate_percentage}%`}
              </span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-indigo-100">
              <span className="text-[11px] text-slate-500 block">Tax Liability:</span>
              <span className="text-sm font-bold text-indigo-700">
                {formatCurrency(preview.taxAmount)}
              </span>
            </div>

            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <span className="text-[11px] text-indigo-200 block">Total Due:</span>
              <span className="text-sm font-bold">{formatCurrency(preview.totalWithTax)}</span>
            </div>
          </div>
        </div>

        {/* AUDIT TIMESTAMPS */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>Created: {formatDateTime(taxRule.created_at)}</span>
          <span>Last Updated: {formatDateTime(taxRule.updated_at)}</span>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Back to Tax Rules
          </Button>

          {canManage && (
            <div className="flex items-center space-x-2">
              {taxRule.is_active ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onDeactivate?.(taxRule);
                  }}
                  className="text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <PowerOff className="w-4 h-4 mr-1.5 text-red-600" />
                  Deactivate Rule
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onReactivate?.(taxRule);
                  }}
                  className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5 text-emerald-600" />
                  Reactivate Rule
                </Button>
              )}

              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onEdit?.(taxRule);
                }}
              >
                <Edit className="w-4 h-4 mr-1.5" />
                Edit Rule
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
