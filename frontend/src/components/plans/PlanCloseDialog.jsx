import React, { useState } from 'react';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { planService } from '../../services/planService';
import { PowerOff } from 'lucide-react';

export default function PlanCloseDialog({
  isOpen,
  onClose,
  plan,
  onSuccess,
}) {
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  if (!plan) return null;

  const handleConfirm = async () => {
    setClosing(true);
    setError('');

    try {
      await planService.closePlan(plan.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to close subscription plan. Please retry.'
      );
    } finally {
      setClosing(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={`Close Subscription Plan: ${plan.name}`}
      variant="danger"
      confirmText={closing ? 'Closing Plan...' : 'Confirm Closure'}
      confirmButtonProps={{ disabled: closing }}
      icon={PowerOff}
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          Are you sure you want to close the subscription plan{' '}
          <strong className="text-slate-900">{plan.name}</strong> ({plan.code})?
        </p>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1.5">
          <p className="font-semibold text-amber-950">Business Lifecycle Impact:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>The plan status will be updated to inactive and its availability end date set to now.</li>
            <li>New sales quotes and customer checkouts will no longer be able to select this plan.</li>
            <li>
              <strong>Existing subscriptions remain active:</strong> Customers currently subscribed to this plan will continue their recurring billing cycles uninterrupted.
            </li>
          </ul>
        </div>

        {error && (
          <p className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-medium">
            {error}
          </p>
        )}
      </div>
    </ConfirmationDialog>
  );
}
