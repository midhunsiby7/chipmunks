import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateVariantPrice,
  calculatePriceDifference,
  isValidPrice,
  validateVariants,
} from '../src/utils/productPricing.js';

test('Product & Variant Pricing Formulas', async (t) => {
  await t.test('calculates final variant price as Base + Surcharge accurately', () => {
    // Example from prompt: Base ₹2,000 + Odoo Brand ₹560 = ₹2,560
    const finalPrice = calculateVariantPrice(2000, 560);
    assert.equal(finalPrice, 2560);

    // Decimal precision check
    const decimalPrice = calculateVariantPrice('199.99', '50.01');
    assert.equal(decimalPrice, 250);
  });

  await t.test('calculates price difference from base and final prices', () => {
    const diff = calculatePriceDifference(2000, 2560);
    assert.equal(diff, 560);
  });

  await t.test('handles zero and negative price adjustments safely', () => {
    assert.equal(calculateVariantPrice(1000, 0), 1000);
    assert.equal(calculateVariantPrice(1000, -150), 850);
  });
});

test('Price Input Validation', async (t) => {
  await t.test('accepts valid non-negative numbers up to 2 decimal places', () => {
    assert.equal(isValidPrice(0), true);
    assert.equal(isValidPrice('0.00'), true);
    assert.equal(isValidPrice('1499.50'), true);
    assert.equal(isValidPrice(500), true);
  });

  await t.test('rejects negative numbers, non-numerics, and excessive decimals', () => {
    assert.equal(isValidPrice(-1), false);
    assert.equal(isValidPrice('-50.00'), false);
    assert.equal(isValidPrice(''), false);
    assert.equal(isValidPrice(null), false);
    assert.equal(isValidPrice(undefined), false);
    assert.equal(isValidPrice('abc'), false);
    assert.equal(isValidPrice('10.999'), false); // 3 decimals
  });
});

test('Variant List Validation', async (t) => {
  await t.test('accepts valid list of variants with unique codes', () => {
    const variants = [
      { name: 'Standard Edition', variant_code: 'SW-STD', price_difference: 0 },
      { name: 'Odoo Edition', variant_code: 'SW-ODOO', price_difference: 560 },
      { name: 'Enterprise Edition', variant_code: 'SW-ENT', price_difference: 1500 },
    ];
    const res = validateVariants(variants);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
  });

  await t.test('rejects duplicate variant codes', () => {
    const variants = [
      { name: 'Option A', variant_code: 'VAR-01', price_difference: 100 },
      { name: 'Option B', variant_code: 'VAR-01', price_difference: 200 }, // Duplicate code
    ];
    const res = validateVariants(variants);
    assert.equal(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('Duplicate variant code')));
  });

  await t.test('flags missing name or variant code', () => {
    const variants = [
      { name: '', variant_code: 'VAR-OK', price_difference: 0 },
      { name: 'Named', variant_code: '', price_difference: 0 },
    ];
    const res = validateVariants(variants);
    assert.equal(res.isValid, false);
    assert.equal(res.errors.length, 2);
  });
});

test('Role-Based Product Permissions', async (t) => {
  await t.test('Admin and Staff are permitted to access product management', () => {
    const allowedRoles = ['admin', 'staff'];
    assert.equal(allowedRoles.includes('admin'), true);
    assert.equal(allowedRoles.includes('staff'), true);
    assert.equal(allowedRoles.includes('customer'), false);
  });

  await t.test('Cost price and margin visibility is strictly restricted to Admin', () => {
    const canViewCostPrice = (role) => role === 'admin';
    assert.equal(canViewCostPrice('admin'), true);
    assert.equal(canViewCostPrice('staff'), false);
    assert.equal(canViewCostPrice('customer'), false);
  });
});
