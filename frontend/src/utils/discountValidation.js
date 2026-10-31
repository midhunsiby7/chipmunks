/**
 * Validation utilities and business rules for Brightloop Discount and Promotion Management.
 */

export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
};

/**
 * Validates discount creation and update payloads before submitting to backend.
 * Conforms to app.schemas.discount.DiscountBase and backend constraints.
 * 
 * @param {Object} data 
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateDiscountPayload(data) {
  const errors = {};

  // Code validation
  if (!data.code || typeof data.code !== 'string' || !data.code.trim()) {
    errors.code = 'Discount code is required.';
  } else {
    const trimmed = data.code.trim();
    if (trimmed.length > 50) {
      errors.code = 'Discount code cannot exceed 50 characters.';
    } else if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      errors.code = 'Discount code must contain only letters, numbers, hyphens, and underscores.';
    }
  }

  // Description length check
  if (data.description && data.description.length > 255) {
    errors.description = 'Description cannot exceed 255 characters.';
  }

  // Discount type validation
  if (!data.discount_type || !Object.values(DISCOUNT_TYPES).includes(data.discount_type)) {
    errors.discount_type = 'Valid discount type (percentage or fixed_amount) is required.';
  }

  // Value validation
  const numVal = parseFloat(data.value);
  if (data.value === undefined || data.value === null || data.value === '' || isNaN(numVal)) {
    errors.value = 'Discount value is required.';
  } else if (numVal <= 0) {
    errors.value = 'Discount value must be greater than zero.';
  } else if (data.discount_type === DISCOUNT_TYPES.PERCENTAGE && numVal > 100) {
    errors.value = 'Percentage discount cannot exceed 100%.';
  }

  // Minimum purchase amount
  if (data.minimum_purchase_amount !== undefined && data.minimum_purchase_amount !== null && data.minimum_purchase_amount !== '') {
    const minSpend = parseFloat(data.minimum_purchase_amount);
    if (isNaN(minSpend) || minSpend < 0) {
      errors.minimum_purchase_amount = 'Minimum purchase amount must be greater than or equal to 0.';
    }
  }

  // Minimum quantity
  if (data.minimum_quantity !== undefined && data.minimum_quantity !== null && data.minimum_quantity !== '') {
    const minQty = parseInt(data.minimum_quantity, 10);
    if (isNaN(minQty) || minQty < 1) {
      errors.minimum_quantity = 'Minimum quantity must be an integer of at least 1.';
    }
  }

  // Validity dates
  if (!data.valid_from) {
    errors.valid_from = 'Start validity date (valid_from) is required.';
  } else {
    const fromDate = new Date(data.valid_from);
    if (isNaN(fromDate.getTime())) {
      errors.valid_from = 'Invalid start validity date.';
    }
  }

  if (data.valid_until) {
    const untilDate = new Date(data.valid_until);
    if (isNaN(untilDate.getTime())) {
      errors.valid_until = 'Invalid expiration date.';
    } else if (data.valid_from) {
      const fromDate = new Date(data.valid_from);
      if (!isNaN(fromDate.getTime()) && untilDate < fromDate) {
        errors.valid_until = 'Expiration date must be after the start validity date.';
      }
    }
  }

  // Max redemptions
  if (data.max_redemptions !== undefined && data.max_redemptions !== null && data.max_redemptions !== '') {
    const maxRedemptions = parseInt(data.max_redemptions, 10);
    if (isNaN(maxRedemptions) || maxRedemptions < 1) {
      errors.max_redemptions = 'Maximum redemptions must be an integer of at least 1.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats discount value for clean visual presentation.
 * 
 * @param {string} type 
 * @param {number|string} value 
 * @returns {string} e.g. "20%" or "₹500.00"
 */
export function formatDiscountValue(type, value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '₹0.00';

  if (type === DISCOUNT_TYPES.PERCENTAGE) {
    return `${num}%`;
  }

  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Checks if a discount validity window has elapsed.
 * 
 * @param {string|Date|null} validUntil 
 * @returns {boolean}
 */
export function isDiscountExpired(validUntil) {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() < Date.now();
}

/**
 * Checks if a discount has reached its configured redemption ceiling.
 * 
 * @param {number} currentRedemptions 
 * @param {number|null} maxRedemptions 
 * @returns {boolean}
 */
export function isDiscountExhausted(currentRedemptions, maxRedemptions) {
  if (!maxRedemptions || maxRedemptions <= 0) return false;
  return (currentRedemptions || 0) >= maxRedemptions;
}

/**
 * Evaluates comprehensive status badge metadata for a discount object.
 * 
 * @param {Object} discount 
 * @returns {{ label: string, color: 'emerald' | 'amber' | 'red' | 'blue' | 'slate', description: string }}
 */
export function getDiscountStatus(discount) {
  if (!discount || !discount.is_active) {
    return {
      label: 'Inactive',
      color: 'slate',
      description: 'Disabled by administrator',
    };
  }

  if (isDiscountExhausted(discount.current_redemptions, discount.max_redemptions)) {
    return {
      label: 'Exhausted',
      color: 'amber',
      description: 'Redemption limit reached',
    };
  }

  if (isDiscountExpired(discount.valid_until)) {
    return {
      label: 'Expired',
      color: 'red',
      description: 'Validity period has ended',
    };
  }

  if (discount.valid_from && new Date(discount.valid_from).getTime() > Date.now()) {
    return {
      label: 'Scheduled',
      color: 'blue',
      description: 'Not yet active',
    };
  }

  return {
    label: 'Active',
    color: 'emerald',
    description: 'Available for redemptions',
  };
}

/**
 * Client-side calculation helper to estimate discount deductions before server validation.
 * 
 * @param {number} amount 
 * @param {number} quantity 
 * @param {Object} discount 
 * @returns {{ valid: boolean, calculatedDiscount: number, reason?: string }}
 */
export function calculateEstimatedDiscount(amount, quantity = 1, discount) {
  if (!discount || !discount.is_active) {
    return { valid: false, calculatedDiscount: 0, reason: 'Discount is inactive or unavailable.' };
  }

  if (isDiscountExpired(discount.valid_until)) {
    return { valid: false, calculatedDiscount: 0, reason: 'Discount has expired.' };
  }

  if (isDiscountExhausted(discount.current_redemptions, discount.max_redemptions)) {
    return { valid: false, calculatedDiscount: 0, reason: 'Discount redemption limit has been reached.' };
  }

  const minSpend = parseFloat(discount.minimum_purchase_amount || 0);
  if (amount < minSpend) {
    return { valid: false, calculatedDiscount: 0, reason: `Minimum purchase of ₹${minSpend.toFixed(2)} required.` };
  }

  const minQty = parseInt(discount.minimum_quantity || 1, 10);
  if (quantity < minQty) {
    return { valid: false, calculatedDiscount: 0, reason: `Minimum quantity of ${minQty} items required.` };
  }

  const val = parseFloat(discount.value || 0);
  let deduction = 0;

  if (discount.discount_type === DISCOUNT_TYPES.PERCENTAGE) {
    deduction = Math.round((amount * (val / 100)) * 100) / 100;
  } else {
    deduction = val;
  }

  // Cannot discount more than the subtotal
  deduction = Math.min(amount, deduction);

  return {
    valid: true,
    calculatedDiscount: deduction,
  };
}

/**
 * Check whether a user role has authority to configure or manage discounts.
 * 
 * @param {string} role 
 * @returns {boolean}
 */
export function canManageDiscounts(role) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return normalized === 'admin' || normalized === 'staff';
}
