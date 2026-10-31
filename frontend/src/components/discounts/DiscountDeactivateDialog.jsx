import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { discountService } from '../../services/discountService';
import { AlertTriangle, Loader2, Power, CheckCircle2 } from 'lucide-react';

export default function DiscountDeactivateDialog({
  isOpen,
  onClose,
  onSuccess,
  discount,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!discount) return null;

  const isDeactivating = discount.is_active;

  const handleAction = async () => {
    setError('');
    setSubmitting(true);

    try {
      if (isDeactivating) {
        await discountService.deactivateDiscount(discount.id);
      } else {
        await discountService.reactivateDiscount(discount.id);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        `Failed to ${isDeactivating ? 'deactivate' : 'reactivate'} discount. Please try again.`;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2 text-slate-900">
          {isDeactivating ? (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          <span>{isDeactivating ? 'Deactivate Promotional Discount' : 'Reactivate Promotional Discount'}</span>
        </div>
      }
      size="sm"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <p className="text-sm text-slate-600">
          {isDeactivating ? (
            <>
              Are you sure you want to deactivate discount code{' '}
              <strong className="font-mono text-slate-900 uppercase">{discount.code}</strong>?
              Customers and sales staff will no longer be able to validate or apply this code to quotations or new subscriptions.
            </>
          ) : (
            <>
              Are you sure you want to reactivate discount code{' '}
              <strong className="font-mono text-slate-900 uppercase">{discount.code}</strong>?
              This promotional code will become valid for customer checkout and quotation orders again.
            </>
          )}
        </p>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs text-slate-500">
          <div className="flex justify-between">
            <span>Current Redemptions:</span>
            <span className="font-semibold text-slate-700">{discount.current_redemptions || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Redemption Cap:</span>
            <span className="font-semibold text-slate-700">
              {discount.max_redemptions || 'Unlimited'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={isDeactivating ? 'danger' : 'primary'}
            onClick={handleAction}
            disabled={submitting}
            className="flex items-center space-x-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Power className="w-4 h-4" />
                <span>{isDeactivating ? 'Confirm Deactivation' : 'Confirm Activation'}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
