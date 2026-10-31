import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { invoiceService } from '../../services/invoiceService';
import {
  Repeat,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export default function RecurringBillingModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [serverError, setServerError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setServerError('');
    setResult(null);
    setSubmitting(true);

    let targetIso = null;
    if (targetDate) {
      try {
        targetIso = new Date(targetDate).toISOString();
      } catch {
        targetIso = targetDate;
      }
    }

    try {
      const res = await invoiceService.generateRecurringInvoices({ targetDate: targetIso });
      setResult(res);
      onSuccess?.();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to execute recurring billing run. Please check backend server status.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2 text-indigo-700">
          <Repeat className="w-5 h-5" />
          <span>Automated Recurring Billing Engine</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* EXPLANATORY ARCHITECTURE BANNER */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2 text-xs text-slate-700">
          <div className="flex items-center space-x-2 font-bold text-indigo-900">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Idempotency & Duplicate Billing Prevention</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            The backend recurring billing engine evaluates all <strong className="text-slate-900">ACTIVE</strong> contracts whose next billing date falls on or before the target date.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Uniqueness is enforced at the database level via <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-indigo-700">uq_invoice_sub_period</code> (Subscription + Period Start + Period End). It is mathematically impossible for duplicate invoices to be generated for the same billing cycle.
          </p>
        </div>

        {!result ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="recurring-target-date" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Evaluation Target Date / Timestamp *
              </label>
              <div className="relative">
                <input
                  id="recurring-target-date"
                  type="datetime-local"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Contracts scheduled on or prior to this timestamp will be advanced and billed.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Invoices...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Run Billing Engine</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Recurring Billing Run Completed</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-center">
                  <span className="text-slate-500 block">Invoices Generated</span>
                  <span className="text-xl font-black text-emerald-700">
                    {result.invoices_generated}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 text-center">
                  <span className="text-slate-500 block">Periods Skipped / Advanced</span>
                  <span className="text-xl font-black text-slate-700">
                    {result.skipped_count}
                  </span>
                </div>
              </div>

              <p className="text-xs text-emerald-900 font-medium">
                {result.message}
              </p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button variant="primary" onClick={onClose}>
                Done & View Invoices
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
