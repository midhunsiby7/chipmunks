/**
 * Brightloop Quotation Validation & Calculation Utilities
 *
 * Implements deterministic client-side validation rules, pricing calculations,
 * and status mapping mirroring backend FastAPI quotation schemas.
 */

export const QUOTATION_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'converted',
];

/**
 * Validates a quotation creation or update payload before API submission.
 *
 * @param {{
 *   customer_id: string,
 *   valid_until: string,
 *   lines: Array<{
 *     description: string,
 *     quantity: number|string,
 *     unit_price: number|string,
 *     product_variant_id?: string|null,
 *     plan_id?: string|null,
 *   }>,
 *   discount_code?: string|null,
 *   tax_rule_id?: string|null,
 * }} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateQuotationPayload(data) {
  const errors = {};

  if (!data.customer_id || !data.customer_id.trim()) {
    errors.customer_id = 'A customer must be selected.';
  }

  if (!data.valid_until) {
    errors.valid_until = 'Quotation validity expiry date is required.';
  } else {
    const until = new Date(data.valid_until).getTime();
    if (isNaN(until)) {
      errors.valid_until = 'Invalid expiration date format.';
    }
  }

  if (!Array.isArray(data.lines) || data.lines.length === 0) {
    errors.lines = 'Quotation must include at least one itemized line.';
  } else {
    data.lines.forEach((line, idx) => {
      if (!line.description || !line.description.trim()) {
        errors[`line_${idx}_description`] = `Line ${idx + 1}: Description is required.`;
      }

      const qty = Number(line.quantity);
      if (isNaN(qty) || qty < 1 || !Number.isInteger(qty)) {
        errors[`line_${idx}_quantity`] = `Line ${idx + 1}: Quantity must be an integer of 1 or more.`;
      }

      const price = Number(line.unit_price);
      if (isNaN(price) || price < 0) {
        errors[`line_${idx}_price`] = `Line ${idx + 1}: Unit price must be a non-negative number.`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates informational financial preview for a quotation before submission.
 * Mirrors backend QuotationService.create_quotation calculation logic.
 *
 * @param {Array<{ quantity: number|string, unit_price: number|string }>} lines
 * @param {{ rate_percentage?: number|string, is_fixed?: boolean }|null} [taxRule=null]
 * @param {number|string} [discountDeduction=0]
 * @returns {{
 *   subtotal: number,
 *   discountAmount: number,
 *   taxBase: number,
 *   taxAmount: number,
 *   totalAmount: number
 * }}
 */
export function calculateQuotationTotals(lines = [], taxRule = null, discountDeduction = 0) {
  let subtotal = 0;

  lines.forEach((line) => {
    const qty = Number(line.quantity) || 0;
    const price = Number(line.unit_price) || 0;
    subtotal += Math.round(qty * price * 100) / 100;
  });

  const discount = Math.min(subtotal, Math.max(0, Number(discountDeduction) || 0));
  const taxBase = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

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
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discount * 100) / 100,
    taxBase,
    taxAmount,
    totalAmount,
  };
}

/**
 * Checks whether a quotation has passed its validity expiration date.
 *
 * @param {string|Date|null|undefined} validUntil
 * @returns {boolean}
 */
export function isQuotationExpired(validUntil) {
  if (!validUntil) return false;
  try {
    const until = new Date(validUntil).getTime();
    return !isNaN(until) && until < Date.now();
  } catch {
    return false;
  }
}

/**
 * Returns the badge variant and label for a quotation status.
 *
 * @param {string} status
 * @param {boolean} [isExpired=false]
 * @returns {{ variant: string, label: string }}
 */
export function getQuotationStatusBadgeConfig(status, isExpired = false) {
  const norm = String(status || '').toLowerCase();

  if (norm === 'converted') {
    return { variant: 'info', label: 'Converted to Subscription' };
  }
  if (norm === 'accepted') {
    return { variant: 'success', label: 'Accepted' };
  }
  if (norm === 'rejected') {
    return { variant: 'danger', label: 'Rejected' };
  }
  if (isExpired || norm === 'expired') {
    return { variant: 'danger', label: 'Expired' };
  }
  if (norm === 'sent') {
    return { variant: 'warning', label: 'Sent to Customer' };
  }
  return { variant: 'default', label: 'Draft' };
}
