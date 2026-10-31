import React, { useState } from 'react';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { quotationService } from '../../services/quotationService';
import { Send, CheckCircle2, XCircle, Repeat } from 'lucide-react';

export default function QuotationActionDialog({
  isOpen,
  onClose,
  actionType,
  quotation,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!quotation) return null;

  let title = '';
  let variant = 'primary';
  let confirmText = 'Confirm';
  let Icon = Send;
  let description = '';

  switch (actionType) {
    case 'send':
      title = `Send Quotation: ${quotation.quotation_number}`;
      variant = 'primary';
      confirmText = 'Send to Customer';
      Icon = Send;
      description =
        'This will issue and dispatch the quotation to the customer. Its status will transition from Draft to Sent, allowing the customer to review and accept the proposal.';
      break;
    case 'accept':
      title = `Accept Quotation: ${quotation.quotation_number}`;
      variant = 'success';
      confirmText = 'Confirm Acceptance';
      Icon = CheckCircle2;
      description =
        'This records agreement to the terms, items, and pricing in this quotation. Once accepted, the quotation can be converted into an active recurring subscription.';
      break;
    case 'reject':
      title = `Reject Quotation: ${quotation.quotation_number}`;
      variant = 'danger';
      confirmText = 'Confirm Rejection';
      Icon = XCircle;
      description =
        'Are you sure you want to decline this quotation proposal? This action marks the quotation as Rejected.';
      break;
    case 'convert':
      title = `Convert Quotation: ${quotation.quotation_number}`;
      variant = 'primary';
      confirmText = 'Convert to Subscription';
      Icon = Repeat;
      description =
        'This will initiate an active recurring subscription for the customer based on the accepted quotation terms. Quotation status will become Converted.';
      break;
    default:
      return null;
  }

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      if (actionType === 'send') {
        await quotationService.sendQuotation(quotation.id);
      } else if (actionType === 'accept') {
        await quotationService.acceptQuotation(quotation.id);
      } else if (actionType === 'reject') {
        await quotationService.rejectQuotation(quotation.id);
      } else if (actionType === 'convert') {
        await quotationService.convertToSubscription(quotation.id);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          `Failed to execute ${actionType} action. Please retry.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={title}
      variant={variant}
      confirmText={loading ? 'Processing...' : confirmText}
      confirmButtonProps={{ disabled: loading }}
      icon={Icon}
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p>{description}</p>
        {error && (
          <p className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-medium">
            {error}
          </p>
        )}
      </div>
    </ConfirmationDialog>
  );
}
