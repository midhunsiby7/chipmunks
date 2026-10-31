import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { invoiceService } from '../../services/invoiceService';
import { formatCurrency } from '../../utils/formatters';
import { XCircle, Loader2 } from 'lucide-react';

export default function InvoiceCancelDialog({
  isOpen,
  onClose,
  onSuccess,
  invoice,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  if (!invoice) return null;

  const handleCancel = async () => {
    setServerError('');
    setSubmitting(true);

    try {
      await invoiceService.cancelInvoice(invoice.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to cancel invoice. Invoices with recorded payments cannot be cancelled.';
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
        <div className="flex items-center space-x-2 text-red-600">
          <XCircle className="w-5 h-5" />
          <span>Cancel Tax Invoice</span>
        </div>
      }
      size="sm"
    >
      <div className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {serverError}
          </div>
        )}

        <p className="text-sm text-slate-600">
          Are you sure you want to cancel invoice{' '}
          <strong className="font-mono text-slate-900">{invoice.invoice_number}</strong>?
        </p>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Invoice Total:</span>
            <span className="font-semibold text-slate-700">
              {formatCurrency(invoice.total_amount, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Amount Due:</span>
            <span className="font-semibold text-red-600">
              {formatCurrency(invoice.amount_due, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Payments Recorded:</span>
            <span className="font-semibold text-slate-700">
              {formatCurrency(invoice.amount_paid, invoice.currency)}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Cancelling will permanently mark the invoice as CANCELLED and zero out future collection obligations. Invoices with recorded payments cannot be cancelled.
        </p>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Keep Invoice
          </Button>
          <Button
            variant="danger"
            onClick={handleCancel}
            disabled={submitting}
            className="flex items-center space-x-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Confirm Cancellation</span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
