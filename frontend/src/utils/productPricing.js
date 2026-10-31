/**
 * Brightloop Product & Variant Pricing Utilities
 * Provides decimal-safe price calculations and variant price preview formulas.
 */

/**
 * Calculates the total final price for a variant given the product's base price
 * and the variant's additional price (price_difference).
 *
 * Formula: Final Price = Base Sales Price + Variant Price Difference
 *
 * @param {number|string} baseSalesPrice
 * @param {number|string} priceDifference
 * @returns {number}
 */
export function calculateVariantPrice(baseSalesPrice, priceDifference) {
  const base = parseFloat(baseSalesPrice) || 0;
  const diff = parseFloat(priceDifference) || 0;
  // Decimal-safe rounded to 2 decimal places
  return Math.round((base + diff) * 100) / 100;
}

/**
 * Calculates the price difference from base price given the final variant price.
 *
 * Formula: Price Difference = Final Price - Base Sales Price
 *
 * @param {number|string} baseSalesPrice
 * @param {number|string} finalPrice
 * @returns {number}
 */
export function calculatePriceDifference(baseSalesPrice, finalPrice) {
  const base = parseFloat(baseSalesPrice) || 0;
  const final = parseFloat(finalPrice) || 0;
  return Math.round((final - base) * 100) / 100;
}

/**
 * Validates whether a price value is a valid non-negative decimal amount.
 * @param {any} value
 * @returns {boolean}
 */
export function isValidPrice(value) {
  if (value === null || value === undefined || value === '') return false;
  const num = Number(value);
  if (isNaN(num)) return false;
  if (num < 0) return false;
  // Up to 2 decimal places allowed
  const str = String(value);
  const parts = str.split('.');
  if (parts.length > 2) return false;
  if (parts.length === 2 && parts[1].length > 2) return false;
  return true;
}

/**
 * Validates a list of variants for uniqueness and field validity.
 * @param {Array<{ name: string, variant_code: string, price_difference: number|string }>} variants
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateVariants(variants = []) {
  const errors = [];
  const seenCodes = new Set();

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const indexStr = `Variant #${i + 1}`;

    if (!v.name || !v.name.trim()) {
      errors.push(`${indexStr}: Variant name is required.`);
    }

    if (!v.variant_code || !v.variant_code.trim()) {
      errors.push(`${indexStr}: Variant code is required.`);
    } else {
      const code = v.variant_code.trim().toUpperCase();
      if (seenCodes.has(code)) {
        errors.push(`${indexStr}: Duplicate variant code '${code}'. Each variant code must be unique.`);
      }
      seenCodes.add(code);
    }

    if (v.price_difference !== undefined && v.price_difference !== null && v.price_difference !== '') {
      const diff = Number(v.price_difference);
      if (isNaN(diff)) {
        errors.push(`${indexStr}: Price addition must be a valid number.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
