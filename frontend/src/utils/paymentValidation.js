/**
 * Brightloop Payment Validation and Reconciliation Business Rules
 * Conforms to backend models app.models.payment and app.schemas.payment.
 */

export const PAYMENT_METHODS = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  RAZORPAY: 'razorpay',
  CREDIT_CARD: 'credit_card',
  MANUAL: 'manual',
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
};

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

export const PAYMENT_METHOD_OPTIONS = [
  { value: PAYMENT_METHODS.BANK_TRANSFER, label: 'Bank Transfer (NEFT/RTGS/IMPS)', icon: 'Landmark' },
  { value: PAYMENT_METHODS.CREDIT_CARD, label: 'Credit / Debit Card (Offline)', icon: 'CreditCard' },
  { value: PAYMENT_METHODS.CASH, label: 'Cash Payment', icon: 'Banknote' },
  { value: PAYMENT_METHODS.MANUAL, label: 'Manual Accounting Adjustment', icon: 'FileText' },
  { value: PAYMENT_METHODS.RAZORPAY, label: 'Razorpay Online Checkout', icon: 'Zap' },
  { value: PAYMENT_METHODS.STRIPE, label: 'Stripe Gateway', icon: 'Globe' },
  { value: PAYMENT_METHODS.PAYPAL, label: 'PayPal', icon: 'Wallet' },
];

/**
 * Returns visual status badge metadata for a payment status.
 *
 * @param {string} status
 * @returns {{ variant: string, label: string, dot: boolean, color: string }}
 */
export function getPaymentStatusBadge(status) {
  const norm = (status || '').toLowerCase();
  switch (norm) {
    case PAYMENT_STATUSES.COMPLETED:
      return { variant: 'success', label: 'Completed', dot: true, color: 'emerald' };
    case PAYMENT_STATUSES.PENDING:
      return { variant: 'warning', label: 'Pending', dot: true, color: 'amber' };
    case PAYMENT_STATUSES.FAILED:
      return { variant: 'danger', label: 'Failed', dot: false, color: 'red' };
    case PAYMENT_STATUSES.REFUNDED:
      return { variant: 'info', label: 'Refunded', dot: false, color: 'purple' };
    default:
      return { variant: 'default', label: status || 'Unknown', dot: false, color: 'slate' };
  }
}

/**
 * Returns formatted label and display metadata for a payment method.
 *
 * @param {string} method
 * @returns {{ label: string, isOnline: boolean }}
 */
export function getPaymentMethodBadge(method) {
  const norm = (method || '').toLowerCase();
  switch (norm) {
    case PAYMENT_METHODS.RAZORPAY:
      return { label: 'Razorpay (Online)', isOnline: true };
    case PAYMENT_METHODS.BANK_TRANSFER:
      return { label: 'Bank Transfer', isOnline: false };
    case PAYMENT_METHODS.CREDIT_CARD:
      return { label: 'Credit / Debit Card', isOnline: false };
    case PAYMENT_METHODS.CASH:
      return { label: 'Cash', isOnline: false };
    case PAYMENT_METHODS.MANUAL:
      return { label: 'Manual / Internal', isOnline: false };
    case PAYMENT_METHODS.STRIPE:
      return { label: 'Stripe', isOnline: true };
    case PAYMENT_METHODS.PAYPAL:
      return { label: 'PayPal', isOnline: true };
    default:
      return { label: method || 'Other', isOnline: false };
  }
}

/**
 * Validates manual payment recording payload before submission to the backend.
 * Enforces non-negative positive amounts and prevents overpayments against invoice balance.
 *
 * @param {Object} data
 * @param {Object|null} [invoice=null] Optional invoice to check outstanding amount
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validatePaymentPayload(data, invoice = null) {
  const errors = {};

  if (!data.invoice_id || typeof data.invoice_id !== 'string' || !data.invoice_id.trim()) {
    errors.invoice_id = 'Invoice selection is required.';
  }

  const amt = Number(data.amount);
  if (isNaN(amt) || amt <= 0) {
    errors.amount = 'Payment amount must be greater than zero.';
  } else if (invoice) {
    const outstanding = Number(invoice.amount_due ?? 0);
    // Allow slight float tolerance (0.005)
    if (amt > outstanding + 0.005) {
      errors.amount = `Payment amount exceeds invoice balance due of ${outstanding.toFixed(2)}.`;
    }
  }

  const validMethods = Object.values(PAYMENT_METHODS);
  if (!data.payment_method || !validMethods.includes(data.payment_method.toLowerCase())) {
    errors.payment_method = 'Please select a valid payment method.';
  }

  if (data.currency && (typeof data.currency !== 'string' || data.currency.trim().length !== 3)) {
    errors.currency = 'Currency must be a 3-character ISO code (e.g. USD, INR).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates updated paid amount and remaining balance preview for an invoice.
 *
 * @param {number|string} totalAmount
 * @param {number|string} currentPaid
 * @param {number|string} newPaymentAmount
 * @returns {{
 *   updatedPaid: number,
 *   remainingDue: number,
 *   isFullSettlement: boolean,
 *   isOverpayment: boolean,
 *   resultingStatus: string
 * }}
 */
export function calculateReconciledBalance(totalAmount, currentPaid, newPaymentAmount) {
  const total = Math.max(0, Number(totalAmount) || 0);
  const paid = Math.max(0, Number(currentPaid) || 0);
  const payment = Math.max(0, Number(newPaymentAmount) || 0);

  const updatedPaid = Math.round((paid + payment) * 100) / 100;
  const remainingDue = Math.max(0, Math.round((total - updatedPaid) * 100) / 100);
  const isOverpayment = updatedPaid > total + 0.005;
  const isFullSettlement = remainingDue <= 0;

  const resultingStatus = isFullSettlement ? 'paid' : updatedPaid > 0 ? 'partially_paid' : 'issued';

  return {
    updatedPaid,
    remainingDue,
    isFullSettlement,
    isOverpayment,
    resultingStatus,
  };
}

/**
 * Evaluates whether the current user role is authorized to record offline manual payments.
 * Admin and Staff have authority; Customer is strictly prohibited.
 *
 * @param {string} role
 * @returns {boolean}
 */
export function canRecordManualPayment(role) {
  if (!role) return false;
  const norm = role.toLowerCase();
  return norm === 'admin' || norm === 'staff';
}

/**
 * Evaluates whether an invoice is eligible for online payment via Razorpay.
 *
 * @param {Object} invoice
 * @param {Object} currentUser
 * @returns {boolean}
 */
export function canPayOnline(invoice, currentUser) {
  if (!invoice || !currentUser) return false;

  const status = (invoice.status || '').toLowerCase();
  if (['paid', 'cancelled', 'void'].includes(status)) {
    return false;
  }

  const amountDue = Number(invoice.amount_due ?? 0);
  if (amountDue <= 0) {
    return false;
  }

  const role = (currentUser.role || '').toLowerCase();
  if (role === 'customer') {
    // Customer must be the invoice owner
    return invoice.customer_id === currentUser.id;
  }

  // Admin and Staff can initiate test checkout for demonstration
  return true;
}
