import React, { useState } from 'react';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { productService } from '../../services/productService';

/**
 * Product Deactivation / Reactivation Confirmation Dialog
 *
 * @param {{
 *   isOpen: boolean,
 *   product: any|null,
 *   onClose: () => void,
 *   onSuccess?: () => void
 * }} props
 */
export default function ProductDeactivateDialog({
  isOpen,
  product,
  onClose,
  onSuccess,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!product) return null;

  const isCurrentlyActive = product.is_active;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      if (isCurrentlyActive) {
        await productService.deactivateProduct(product.id);
      } else {
        await productService.reactivateProduct(product.id);
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('[Brightloop ProductDeactivateDialog] Error:', err);
      setErrorMessage(
        err.detail || err.message || 'Failed to update product status. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={isCurrentlyActive ? `Deactivate Product: ${product.name}?` : `Reactivate Product: ${product.name}?`}
      message={
        errorMessage ||
        (isCurrentlyActive
          ? `Deactivating this product will keep all existing quotations and subscriptions intact, but prevent this product from being selected for new sales orders.`
          : `Reactivating this product will make it available immediately in active catalog pickers for new quotations and subscriptions.`)
      }
      confirmText={isCurrentlyActive ? 'Deactivate Product' : 'Reactivate Product'}
      cancelText="Cancel"
      variant={isCurrentlyActive ? 'danger' : 'primary'}
      isLoading={isSubmitting}
    />
  );
}
