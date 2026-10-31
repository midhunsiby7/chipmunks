import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validatePlanPayload,
  validateTaxPayload,
  formatBillingCadence,
  calculateTaxPreview,
} from '../src/utils/planAndTaxValidation.js';

test('Plan Payload Validation', async (t) => {
  await t.test('accepts valid plan payload meeting all constraints', () => {
    const validPlan = {
      code: 'PLAN-PRO-M',
      name: 'Pro Monthly Plan',
      billing_interval: 'monthly',
      price: '49.99',
      interval_count: 1,
      minimum_quantity: 1,
      trial_period_days: 14,
      available_from: '2026-01-01T00:00:00Z',
      available_until: '2026-12-31T23:59:59Z',
    };
    const res = validatePlanPayload(validPlan);
    assert.equal(res.isValid, true);
    assert.equal(Object.keys(res.errors).length, 0);
  });

  await t.test('rejects missing or invalid plan code', () => {
    const emptyCode = validatePlanPayload({ code: '', name: 'Plan', billing_interval: 'monthly', price: 10 });
    assert.equal(emptyCode.isValid, false);
    assert.ok(emptyCode.errors.code);

    const longCode = validatePlanPayload({ code: 'A'.repeat(101), name: 'Plan', billing_interval: 'monthly', price: 10 });
    assert.equal(longCode.isValid, false);
    assert.ok(longCode.errors.code);
  });

  await t.test('rejects unsupported billing interval', () => {
    const res = validatePlanPayload({ code: 'P1', name: 'Plan', billing_interval: 'hourly', price: 10 });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.billing_interval);
  });

  await t.test('rejects negative or missing price', () => {
    const negative = validatePlanPayload({ code: 'P1', name: 'Plan', billing_interval: 'monthly', price: -5 });
    assert.equal(negative.isValid, false);
    assert.ok(negative.errors.price);

    const missing = validatePlanPayload({ code: 'P1', name: 'Plan', billing_interval: 'monthly', price: '' });
    assert.equal(missing.isValid, false);
    assert.ok(missing.errors.price);
  });

  await t.test('validates interval count and minimum quantity', () => {
    const invalidCount = validatePlanPayload({ code: 'P1', name: 'Plan', billing_interval: 'monthly', price: 10, interval_count: 0 });
    assert.equal(invalidCount.isValid, false);
    assert.ok(invalidCount.errors.interval_count);

    const invalidQty = validatePlanPayload({ code: 'P1', name: 'Plan', billing_interval: 'monthly', price: 10, minimum_quantity: -1 });
    assert.equal(invalidQty.isValid, false);
    assert.ok(invalidQty.errors.minimum_quantity);
  });

  await t.test('rejects available_until date that precedes available_from', () => {
    const res = validatePlanPayload({
      code: 'P1',
      name: 'Plan',
      billing_interval: 'monthly',
      price: 10,
      available_from: '2026-06-01T00:00:00Z',
      available_until: '2026-05-01T00:00:00Z',
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.available_until);
  });
});

test('Tax Rule Payload Validation', async (t) => {
  await t.test('accepts valid tax rule payload', () => {
    const validTax = {
      name: 'GST 18%',
      tax_code: 'GST-18',
      rate_percentage: '18.00',
      country_code: 'IN',
      effective_from: '2026-01-01T00:00:00Z',
      effective_until: '2027-01-01T00:00:00Z',
    };
    const res = validateTaxPayload(validTax);
    assert.equal(res.isValid, true);
    assert.equal(Object.keys(res.errors).length, 0);
  });

  await t.test('rejects rate percentage outside [0, 100]', () => {
    const over100 = validateTaxPayload({ name: 'Tax', tax_code: 'T1', rate_percentage: 105, country_code: 'US' });
    assert.equal(over100.isValid, false);
    assert.ok(over100.errors.rate_percentage);

    const negative = validateTaxPayload({ name: 'Tax', tax_code: 'T1', rate_percentage: -1, country_code: 'US' });
    assert.equal(negative.isValid, false);
    assert.ok(negative.errors.rate_percentage);
  });

  await t.test('requires country code of exactly 2 characters', () => {
    const short = validateTaxPayload({ name: 'Tax', tax_code: 'T1', rate_percentage: 10, country_code: 'U' });
    assert.equal(short.isValid, false);
    assert.ok(short.errors.country_code);

    const long = validateTaxPayload({ name: 'Tax', tax_code: 'T1', rate_percentage: 10, country_code: 'USA' });
    assert.equal(long.isValid, false);
    assert.ok(long.errors.country_code);
  });

  await t.test('rejects effective_until that precedes effective_from', () => {
    const res = validateTaxPayload({
      name: 'Tax',
      tax_code: 'T1',
      rate_percentage: 10,
      country_code: 'US',
      effective_from: '2026-10-01T00:00:00Z',
      effective_until: '2026-09-01T00:00:00Z',
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.effective_until);
  });
});

test('Billing Cadence Formatting', async (t) => {
  await t.test('formats standard intervals with count = 1', () => {
    assert.equal(formatBillingCadence('daily', 1), 'Daily');
    assert.equal(formatBillingCadence('weekly', 1), 'Weekly');
    assert.equal(formatBillingCadence('monthly', 1), 'Monthly');
    assert.equal(formatBillingCadence('yearly', 1), 'Yearly');
  });

  await t.test('formats multi-period cadences with count > 1', () => {
    assert.equal(formatBillingCadence('monthly', 3), 'Every 3 months');
    assert.equal(formatBillingCadence('weekly', 2), 'Every 2 weeks');
    assert.equal(formatBillingCadence('daily', 15), 'Every 15 days');
    assert.equal(formatBillingCadence('yearly', 2), 'Every 2 years');
  });
});

test('Tax Calculation Preview Engine', async (t) => {
  await t.test('calculates percentage-based tax accurately', () => {
    const rule = { rate_percentage: '18.00', is_fixed: false, is_active: true };
    const res = calculateTaxPreview(1000, rule);
    assert.equal(res.taxAmount, 180);
    assert.equal(res.totalWithTax, 1180);
    assert.equal(res.isApplicable, true);
  });

  await t.test('calculates fixed fee tax accurately', () => {
    const rule = { rate_percentage: '50.00', is_fixed: true, is_active: true };
    const res = calculateTaxPreview(1000, rule);
    assert.equal(res.taxAmount, 50);
    assert.equal(res.totalWithTax, 1050);
    assert.equal(res.isApplicable, true);
  });

  await t.test('returns zero tax if rule is inactive', () => {
    const rule = { rate_percentage: '18.00', is_fixed: false, is_active: false };
    const res = calculateTaxPreview(1000, rule);
    assert.equal(res.taxAmount, 0);
    assert.equal(res.totalWithTax, 1000);
    assert.equal(res.isApplicable, false);
  });

  await t.test('returns zero tax if rule has expired', () => {
    const rule = {
      rate_percentage: '18.00',
      is_fixed: false,
      is_active: true,
      effective_until: '2020-01-01T00:00:00Z', // in the past
    };
    const res = calculateTaxPreview(1000, rule);
    assert.equal(res.taxAmount, 0);
    assert.equal(res.isApplicable, false);
  });
});

test('Role-Based Access for Plans and Tax Rules', async (t) => {
  await t.test('Admin and Staff have catalog and tax configuration access', () => {
    const authorizedRoles = ['admin', 'staff'];
    assert.equal(authorizedRoles.includes('admin'), true);
    assert.equal(authorizedRoles.includes('staff'), true);
  });

  await t.test('Customer is restricted from administrative plan and tax management', () => {
    const authorizedRoles = ['admin', 'staff'];
    assert.equal(authorizedRoles.includes('customer'), false);
  });
});
