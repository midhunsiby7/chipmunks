/**
 * Validation utilities and business rules for Brightloop Subscription Management.
 * Conforms to backend app.models.subscription and app.schemas.subscription.
 */

export const SUBSCRIPTION_STATUSES = {
  DRAFT: 'draft',
  QUOTATION: 'quotation',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  TRIALING: 'trialing',
};

export const PAYMENT_TERMS_OPTIONS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_15', label: 'Net 15 Days' },
  { value: 'net_30', label: 'Net 30 Days' },
  { value: 'net_60', label: 'Net 60 Days' },
];

/**
 * Returns visual status badge metadata for subscription statuses.
 *
 * @param {string} status
 * @returns {{ variant: string, label: string, dot: boolean, color: string }}
 */
export function getSubscriptionStatusBadge(status) {
  const norm = (status || '').toLowerCase();
  switch (norm) {
    case SUBSCRIPTION_STATUSES.ACTIVE:
      return { variant: 'success', label: 'Active', dot: true, color: 'emerald' };
    case SUBSCRIPTION_STATUSES.TRIALING:
      return { variant: 'info', label: 'Trialing', dot: true, color: 'blue' };
    case SUBSCRIPTION_STATUSES.PAUSED:
      return { variant: 'warning', label: 'Paused', dot: true, color: 'amber' };
    case SUBSCRIPTION_STATUSES.CANCELLED:
      return { variant: 'danger', label: 'Cancelled', dot: true, color: 'red' };
    case SUBSCRIPTION_STATUSES.CLOSED:
      return { variant: 'default', label: 'Closed', dot: false, color: 'slate' };
    case SUBSCRIPTION_STATUSES.EXPIRED:
      return { variant: 'danger', label: 'Expired', dot: false, color: 'red' };
    case SUBSCRIPTION_STATUSES.CONFIRMED:
      return { variant: 'indigo', label: 'Confirmed', dot: true, color: 'indigo' };
    case SUBSCRIPTION_STATUSES.QUOTATION:
      return { variant: 'purple', label: 'Quotation', dot: false, color: 'purple' };
    case SUBSCRIPTION_STATUSES.DRAFT:
      return { variant: 'slate', label: 'Draft', dot: false, color: 'slate' };
    default:
      return { variant: 'default', label: status || 'Unknown', dot: false, color: 'slate' };
  }
}

/**
 * Pure check to evaluate if a subscription expiry date has passed.
 *
 * @param {string|Date|null} expiryDate
 * @returns {boolean}
 */
export function isSubscriptionExpired(expiryDate) {
  if (!expiryDate) return false;
  return new Date(expiryDate).getTime() < Date.now();
}

/**
 * Checks whether an active subscription can be paused.
 *
 * @param {Object} subscription
 * @returns {boolean}
 */
export function canPauseSubscription(subscription) {
  return subscription?.status === SUBSCRIPTION_STATUSES.ACTIVE;
}

/**
 * Checks whether a paused subscription can be resumed.
 *
 * @param {Object} subscription
 * @returns {boolean}
 */
export function canResumeSubscription(subscription) {
  return subscription?.status === SUBSCRIPTION_STATUSES.PAUSED;
}

/**
 * Checks whether a subscription is eligible for cancellation.
 *
 * @param {Object} subscription
 * @returns {boolean}
 */
export function canCancelSubscription(subscription) {
  if (!subscription || !subscription.status) return false;
  return ![
    SUBSCRIPTION_STATUSES.CANCELLED,
    SUBSCRIPTION_STATUSES.CLOSED,
    SUBSCRIPTION_STATUSES.EXPIRED,
  ].includes(subscription.status);
}

/**
 * Checks whether user has permission to administratively close a subscription.
 *
 * @param {Object} subscription
 * @param {string} userRole
 * @returns {boolean}
 */
export function canCloseSubscription(subscription, userRole) {
  if (!userRole) return false;
  const normRole = userRole.toLowerCase();
  const isAdminOrStaff = normRole === 'admin' || normRole === 'staff';
  return isAdminOrStaff && subscription?.status !== SUBSCRIPTION_STATUSES.CLOSED;
}

/**
 * Validates subscription creation payload before sending to backend.
 *
 * @param {Object} data
 * @param {Object|null} [plan=null]
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateSubscriptionPayload(data, plan = null) {
  const errors = {};

  if (!data.customer_id || typeof data.customer_id !== 'string' || !data.customer_id.trim()) {
    errors.customer_id = 'Customer selection is required.';
  }

  if (!data.plan_id || typeof data.plan_id !== 'string' || !data.plan_id.trim()) {
    errors.plan_id = 'Subscription plan selection is required.';
  }

  const qty = Number(data.quantity);
  if (data.quantity === undefined || data.quantity === null || data.quantity === '' || isNaN(qty) || qty < 1 || !Number.isInteger(qty)) {
    errors.quantity = 'Quantity must be a positive integer of at least 1.';
  } else if (plan && plan.minimum_quantity && qty < Number(plan.minimum_quantity)) {
    errors.quantity = `Minimum required quantity for plan '${plan.name}' is ${plan.minimum_quantity}.`;
  }

  if (data.trial_days !== undefined && data.trial_days !== null && data.trial_days !== '') {
    const trial = Number(data.trial_days);
    if (isNaN(trial) || trial < 0 || !Number.isInteger(trial)) {
      errors.trial_days = 'Trial days must be a non-negative integer.';
    }
  }

  if (Array.isArray(data.lines)) {
    data.lines.forEach((line, idx) => {
      if (!line.description || !line.description.trim()) {
        errors[`line_${idx}_description`] = `Line ${idx + 1}: Description is required.`;
      }
      const lineQty = Number(line.quantity);
      if (isNaN(lineQty) || lineQty < 1 || !Number.isInteger(lineQty)) {
        errors[`line_${idx}_quantity`] = `Line ${idx + 1}: Quantity must be an integer of at least 1.`;
      }
      const price = Number(line.unit_price);
      if (isNaN(price) || price < 0) {
        errors[`line_${idx}_price`] = `Line ${idx + 1}: Unit price must be non-negative.`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Client-side calculation to preview estimated subscription financials before server submission.
 *
 * @param {Object|null} plan
 * @param {number|string} quantity
 * @param {Array<Object>} [lines=[]]
 * @param {number|string} [discountDeduction=0]
 * @param {Object|null} [taxRule=null]
 * @returns {{
 *   subtotal: number,
 *   discountAmount: number,
 *   taxBase: number,
 *   taxAmount: number,
 *   totalAmount: number
 * }}
 */
export function calculateEstimatedSubscriptionFinancials(
  plan,
  quantity = 1,
  lines = [],
  discountDeduction = 0,
  taxRule = null
) {
  const planPrice = Number(plan?.price) || 0;
  const planQty = Math.max(1, Number(quantity) || 1);
  const basePlanTotal = Math.round(planPrice * planQty * 100) / 100;

  let linesTotal = 0;
  if (Array.isArray(lines)) {
    lines.forEach((l) => {
      const q = Number(l.quantity) || 0;
      const p = Number(l.unit_price) || 0;
      linesTotal += Math.round(q * p * 100) / 100;
    });
  }

  const subtotal = Math.round((basePlanTotal + linesTotal) * 100) / 100;
  const discountAmount = Math.min(subtotal, Math.max(0, Number(discountDeduction) || 0));
  const taxBase = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  let taxAmount = 0;
  if (taxRule) {
    const rate = Number(taxRule.rate_percentage) || 0;
    if (taxRule.is_fixed) {
      taxAmount = rate;
    } else {
      taxAmount = Math.round(taxBase * (rate / 100) * 100) / 100;
    }
  }

  const totalAmount = Math.round((taxBase + taxAmount) * 100) / 100;

  return {
    subtotal,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxBase,
    taxAmount,
    totalAmount,
  };
}
