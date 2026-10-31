import React, { useState } from 'react';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { taxService } from '../../services/taxService';
import { PowerOff } from 'lucide-react';

export default function TaxDeactivateDialog({
  isOpen,
  onClose,
  taxRule,
  onSuccess,
}) {
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState('');

  if (!taxRule) return null;

  const handleConfirm = async () => {
    setDeactivating(true);
    setError('');

    try {
      await taxService.deactivateTaxRule(taxRule.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to deactivate tax rule. Please retry.'
      );
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={`Deactivate Tax Rule: ${taxRule.name}`}
      variant="danger"
      confirmText={deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
      confirmButtonProps={{ disabled: deactivating }}
      icon={PowerOff}
    >
      <div className="space-y-3 text-sm text-slate-600">
        <p>
          Are you sure you want to deactivate the tax rule{' '}
          <strong className="text-slate-900">{taxRule.name}</strong> ({taxRule.tax_code})?
        </p>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1.5">
          <p className="font-semibold text-amber-950">Tax Audit Impact:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>New sales quotes, checkout sessions, and renewal invoices will no longer calculate this tax rule.</li>
            <li>
              <strong>Historical invoice integrity:</strong> Previously generated invoices and recorded payments retain their historic tax ledger entries unmodified.
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
