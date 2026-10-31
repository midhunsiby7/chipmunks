/**
 * Brightloop Subscription Plan & Tax Validation and Calculations
 *
 * Implements deterministic client-side validation rules and tax calculation
 * mirroring backend FastAPI Pydantic schemas and TaxDiscountService.
 */

export const SUPPORTED_BILLING_INTERVALS = ['daily', 'weekly', 'monthly', 'yearly'];

/**
 * Validates a plan payload before submission to POST /plans or PUT /plans/{id}.
 *
 * @param {{
 *   code: string,
 *   name: string,
 *   billing_interval: string,
 *   price: number|string,
 *   interval_count?: number|string,
 *   minimum_quantity?: number|string,
 *   trial_period_days?: number|string,
 *   available_from?: string|null,
 *   available_until?: string|null,
 * }} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validatePlanPayload(data) {
  const errors = {};

  if (!data.code || !data.code.trim()) {
    errors.code = 'Plan code is required.';
  } else if (data.code.trim().length > 100) {
    errors.code = 'Plan code cannot exceed 100 characters.';
  }

  if (!data.name || !data.name.trim()) {
    errors.name = 'Plan name is required.';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Plan name cannot exceed 255 characters.';
  }

  if (!data.billing_interval || !SUPPORTED_BILLING_INTERVALS.includes(data.billing_interval.toLowerCase())) {
    errors.billing_interval = 'A valid billing interval (daily, weekly, monthly, yearly) is required.';
  }

  const priceNum = Number(data.price);
  if (data.price === '' || data.price === null || data.price === undefined || isNaN(priceNum)) {
    errors.price = 'Price is required.';
  } else if (priceNum < 0) {
    errors.price = 'Price must be greater than or equal to 0.';
  }

  if (data.interval_count !== undefined && data.interval_count !== '') {
    const countNum = Number(data.interval_count);
    if (isNaN(countNum) || countNum < 1 || !Number.isInteger(countNum)) {
      errors.interval_count = 'Interval count must be an integer greater than or equal to 1.';
    }
  }

  if (data.minimum_quantity !== undefined && data.minimum_quantity !== '') {
    const qtyNum = Number(data.minimum_quantity);
    if (isNaN(qtyNum) || qtyNum < 1 || !Number.isInteger(qtyNum)) {
      errors.minimum_quantity = 'Minimum quantity must be an integer greater than or equal to 1.';
    }
  }

  if (data.trial_period_days !== undefined && data.trial_period_days !== '') {
    const trialNum = Number(data.trial_period_days);
    if (isNaN(trialNum) || trialNum < 0 || !Number.isInteger(trialNum)) {
      errors.trial_period_days = 'Trial period days must be an integer greater than or equal to 0.';
    }
  }

  // Date range validation: available_until must not precede available_from
  if (data.available_from && data.available_until) {
    const fromTime = new Date(data.available_from).getTime();
    const untilTime = new Date(data.available_until).getTime();
    if (!isNaN(fromTime) && !isNaN(untilTime) && untilTime < fromTime) {
      errors.available_until = 'Availability end date must be after start date.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates a tax rule payload before submission to POST /taxes or PUT /taxes/{id}.
 *
 * @param {{
 *   name: string,
 *   tax_code: string,
 *   rate_percentage: number|string,
 *   country_code: string,
 *   effective_from?: string|null,
 *   effective_until?: string|null,
 * }} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateTaxPayload(data) {
  const errors = {};

  if (!data.name || !data.name.trim()) {
    errors.name = 'Tax name is required.';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Tax name cannot exceed 100 characters.';
  }

  if (!data.tax_code || !data.tax_code.trim()) {
    errors.tax_code = 'Tax code is required.';
  } else if (data.tax_code.trim().length > 50) {
    errors.tax_code = 'Tax code cannot exceed 50 characters.';
  }

  const rateNum = Number(data.rate_percentage);
  if (data.rate_percentage === '' || data.rate_percentage === null || data.rate_percentage === undefined || isNaN(rateNum)) {
    errors.rate_percentage = 'Rate percentage is required.';
  } else if (rateNum < 0 || rateNum > 100) {
    errors.rate_percentage = 'Rate percentage must be between 0 and 100.';
  }

  if (!data.country_code || !data.country_code.trim()) {
    errors.country_code = '2-letter country code is required.';
  } else if (data.country_code.trim().length !== 2) {
    errors.country_code = 'Country code must be exactly 2 characters (e.g. IN, US).';
  }

  // Date range validation: effective_until must not precede effective_from
  if (data.effective_from && data.effective_until) {
    const fromTime = new Date(data.effective_from).getTime();
    const untilTime = new Date(data.effective_until).getTime();
    if (!isNaN(fromTime) && !isNaN(untilTime) && untilTime < fromTime) {
      errors.effective_until = 'Effective end date must be after effective start date.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats a cadence description for human presentation.
 * e.g., "Monthly" or "Every 3 Months", "Daily", "Yearly"
 *
 * @param {string} interval
 * @param {number} [intervalCount=1]
 * @returns {string}
 */
export function formatBillingCadence(interval, intervalCount = 1) {
  const norm = String(interval || '').toLowerCase();
  const count = Number(intervalCount) || 1;

  if (count === 1) {
    switch (norm) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'yearly':
        return 'Yearly';
      default:
        return norm || 'Custom Cadence';
    }
  }

  switch (norm) {
    case 'daily':
      return `Every ${count} days`;
    case 'weekly':
      return `Every ${count} weeks`;
    case 'monthly':
      return `Every ${count} months`;
    case 'yearly':
      return `Every ${count} years`;
    default:
      return `Every ${count} ${norm}`;
  }
}

/**
 * Checks whether an expiration timestamp has elapsed.
 *
 * @param {string|Date|null|undefined} availableUntil
 * @returns {boolean}
 */
export function isPlanExpired(availableUntil) {
  if (!availableUntil) return false;
  try {
    const until = new Date(availableUntil).getTime();
    return !isNaN(until) && until < Date.now();
  } catch {
    return false;
  }
}

/**
 * Deterministically calculates tax amount mirroring backend TaxDiscountService.calculate_tax.
 *
 * @param {number|string} baseAmount
 * @param {{
 *   rate_percentage: number|string,
 *   is_fixed?: boolean,
 *   is_active?: boolean,
 *   effective_from?: string|null,
 *   effective_until?: string|null,
 * }} rule
 * @returns {{ taxAmount: number, totalWithTax: number, isApplicable: boolean }}
 */
export function calculateTaxPreview(baseAmount, rule) {
  const base = Number(baseAmount) || 0;
  if (!rule || rule.is_active === false) {
    return { taxAmount: 0, totalWithTax: base, isApplicable: false };
  }

  const now = new Date().getTime();
  if (rule.effective_from) {
    const from = new Date(rule.effective_from).getTime();
    if (!isNaN(from) && from > now) {
      return { taxAmount: 0, totalWithTax: base, isApplicable: false };
    }
  }

  if (rule.effective_until) {
    const until = new Date(rule.effective_until).getTime();
    if (!isNaN(until) && until < now) {
      return { taxAmount: 0, totalWithTax: base, isApplicable: false };
    }
  }

  const rate = Number(rule.rate_percentage) || 0;
  let tax = 0;

  if (rule.is_fixed) {
    tax = rate;
  } else {
    tax = Math.round((base * (rate / 100)) * 100) / 100;
  }

  const total = Math.round((base + tax) * 100) / 100;
  return {
    taxAmount: tax,
    totalWithTax: total,
    isApplicable: true,
  };
}
