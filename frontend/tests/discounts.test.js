import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDiscountPayload,
  formatDiscountValue,
  isDiscountExpired,
  isDiscountExhausted,
  getDiscountStatus,
  calculateEstimatedDiscount,
  canManageDiscounts,
  DISCOUNT_TYPES,
} from '../src/utils/discountValidation.js';

test('Discount Payload Validation', async (t) => {
  await t.test('accepts valid percentage discount payload meeting all constraints', () => {
    const payload = {
      code: 'SUMMER25',
      description: 'Summer season 25% discount',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 25,
      minimum_purchase_amount: 1000,
      minimum_quantity: 2,
      valid_from: '2026-06-01T00:00:00Z',
      valid_until: '2026-08-31T23:59:59Z',
      max_redemptions: 500,
      is_active: true,
    };
    const res = validateDiscountPayload(payload);
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('accepts valid fixed amount discount payload without expiry or cap', () => {
    const payload = {
      code: 'WELCOME500',
      description: 'Flat ₹500 off for new signups',
      discount_type: DISCOUNT_TYPES.FIXED_AMOUNT,
      value: 500,
      minimum_purchase_amount: 1500,
      minimum_quantity: 1,
      valid_from: '2026-01-01T00:00:00Z',
      valid_until: null,
      max_redemptions: null,
      is_active: true,
    };
    const res = validateDiscountPayload(payload);
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('rejects missing or empty discount code', () => {
    const res = validateDiscountPayload({
      code: '',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 10,
      valid_from: '2026-01-01T00:00:00Z',
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.code);
  });

  await t.test('rejects discount code with illegal characters or spaces', () => {
    const res = validateDiscountPayload({
      code: 'CODE WITH SPACES!',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 10,
      valid_from: '2026-01-01T00:00:00Z',
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.code);
  });

  await t.test('rejects percentage discount greater than 100%', () => {
    const res = validateDiscountPayload({
      code: 'SUPER150',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 150,
      valid_from: '2026-01-01T00:00:00Z',
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.value);
  });

  await t.test('rejects non-positive discount value (zero or negative)', () => {
    const zeroRes = validateDiscountPayload({
      code: 'ZERO',
      discount_type: DISCOUNT_TYPES.FIXED_AMOUNT,
      value: 0,
      valid_from: '2026-01-01T00:00:00Z',
    });
    assert.equal(zeroRes.isValid, false);
    assert.ok(zeroRes.errors.value);

    const negRes = validateDiscountPayload({
      code: 'NEG',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: -15,
      valid_from: '2026-01-01T00:00:00Z',
    });
    assert.equal(negRes.isValid, false);
    assert.ok(negRes.errors.value);
  });

  await t.test('rejects negative minimum purchase amount', () => {
    const res = validateDiscountPayload({
      code: 'PROMO10',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 10,
      minimum_purchase_amount: -50,
      valid_from: '2026-01-01T00:00:00Z',
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.minimum_purchase_amount);
  });

  await t.test('rejects minimum quantity less than 1', () => {
    const res = validateDiscountPayload({
      code: 'PROMO10',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 10,
      minimum_quantity: 0,
      valid_from: '2026-01-01T00:00:00Z',
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.minimum_quantity);
  });

  await t.test('rejects expiration date that precedes start validity date', () => {
    const res = validateDiscountPayload({
      code: 'EXPIRED_CREATION',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 10,
      valid_from: '2026-05-10T00:00:00Z',
      valid_until: '2026-05-01T00:00:00Z',
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.valid_until);
  });

  await t.test('rejects maximum redemptions limit less than 1', () => {
    const res = validateDiscountPayload({
      code: 'PROMO10',
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 10,
      valid_from: '2026-01-01T00:00:00Z',
      max_redemptions: 0,
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.max_redemptions);
  });
});

test('Discount Value Formatting', async (t) => {
  await t.test('formats percentage values with percent sign', () => {
    assert.equal(formatDiscountValue(DISCOUNT_TYPES.PERCENTAGE, 15), '15%');
    assert.equal(formatDiscountValue(DISCOUNT_TYPES.PERCENTAGE, 33.5), '33.5%');
  });

  await t.test('formats fixed amounts in Indian Rupees (INR)', () => {
    assert.equal(formatDiscountValue(DISCOUNT_TYPES.FIXED_AMOUNT, 500), '₹500.00');
    assert.equal(formatDiscountValue(DISCOUNT_TYPES.FIXED_AMOUNT, 12500.5), '₹12,500.50');
  });
});

test('Discount Expiry and Redemption Exhaustion Checks', async (t) => {
  await t.test('correctly evaluates expired timestamps', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const futureDate = new Date(Date.now() + 3600000).toISOString();

    assert.equal(isDiscountExpired(pastDate), true);
    assert.equal(isDiscountExpired(futureDate), false);
    assert.equal(isDiscountExpired(null), false);
  });

  await t.test('correctly evaluates redemption caps and exhaustion', () => {
    assert.equal(isDiscountExhausted(50, 100), false);
    assert.equal(isDiscountExhausted(100, 100), true);
    assert.equal(isDiscountExhausted(105, 100), true);
    assert.equal(isDiscountExhausted(500, null), false);
  });
});

test('Discount Status Badge Resolution', async (t) => {
  await t.test('resolves Inactive status when is_active is false', () => {
    const status = getDiscountStatus({ is_active: false });
    assert.equal(status.label, 'Inactive');
    assert.equal(status.color, 'slate');
  });

  await t.test('resolves Exhausted status when redemption limit is reached', () => {
    const status = getDiscountStatus({
      is_active: true,
      current_redemptions: 100,
      max_redemptions: 100,
    });
    assert.equal(status.label, 'Exhausted');
    assert.equal(status.color, 'amber');
  });

  await t.test('resolves Expired status when validity period has passed', () => {
    const status = getDiscountStatus({
      is_active: true,
      valid_until: new Date(Date.now() - 100000).toISOString(),
    });
    assert.equal(status.label, 'Expired');
    assert.equal(status.color, 'red');
  });

  await t.test('resolves Scheduled status when start validity is in the future', () => {
    const status = getDiscountStatus({
      is_active: true,
      valid_from: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(status.label, 'Scheduled');
    assert.equal(status.color, 'blue');
  });

  await t.test('resolves Active status for valid, unexpired, unexhausted promotions', () => {
    const status = getDiscountStatus({
      is_active: true,
      valid_from: new Date(Date.now() - 86400000).toISOString(),
      valid_until: new Date(Date.now() + 86400000).toISOString(),
      current_redemptions: 10,
      max_redemptions: 100,
    });
    assert.equal(status.label, 'Active');
    assert.equal(status.color, 'emerald');
  });
});

test('Discount Deduction Calculation Preview', async (t) => {
  await t.test('calculates percentage deduction accurately', () => {
    const discount = {
      is_active: true,
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 20,
      minimum_purchase_amount: 0,
      minimum_quantity: 1,
    };
    const res = calculateEstimatedDiscount(1000, 1, discount);
    assert.equal(res.valid, true);
    assert.equal(res.calculatedDiscount, 200);
  });

  await t.test('calculates fixed deduction accurately', () => {
    const discount = {
      is_active: true,
      discount_type: DISCOUNT_TYPES.FIXED_AMOUNT,
      value: 150,
      minimum_purchase_amount: 500,
      minimum_quantity: 1,
    };
    const res = calculateEstimatedDiscount(600, 1, discount);
    assert.equal(res.valid, true);
    assert.equal(res.calculatedDiscount, 150);
  });

  await t.test('caps deduction at purchase amount (cannot exceed subtotal)', () => {
    const discount = {
      is_active: true,
      discount_type: DISCOUNT_TYPES.FIXED_AMOUNT,
      value: 1000,
      minimum_purchase_amount: 0,
      minimum_quantity: 1,
    };
    const res = calculateEstimatedDiscount(350, 1, discount);
    assert.equal(res.valid, true);
    assert.equal(res.calculatedDiscount, 350);
  });

  await t.test('fails validation when purchase amount is below minimum threshold', () => {
    const discount = {
      is_active: true,
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 20,
      minimum_purchase_amount: 1000,
      minimum_quantity: 1,
    };
    const res = calculateEstimatedDiscount(800, 1, discount);
    assert.equal(res.valid, false);
    assert.equal(res.calculatedDiscount, 0);
    assert.ok(res.reason.includes('Minimum purchase'));
  });

  await t.test('fails validation when order quantity is below minimum quantity', () => {
    const discount = {
      is_active: true,
      discount_type: DISCOUNT_TYPES.PERCENTAGE,
      value: 15,
      minimum_purchase_amount: 0,
      minimum_quantity: 3,
    };
    const res = calculateEstimatedDiscount(1500, 2, discount);
    assert.equal(res.valid, false);
    assert.equal(res.calculatedDiscount, 0);
    assert.ok(res.reason.includes('Minimum quantity'));
  });
});

test('Role-Based Permissions for Promotional Discounts', async (t) => {
  await t.test('Admin and Staff have authority to configure and manage discounts', () => {
    assert.equal(canManageDiscounts('admin'), true);
    assert.equal(canManageDiscounts('ADMIN'), true);
    assert.equal(canManageDiscounts('staff'), true);
    assert.equal(canManageDiscounts('STAFF'), true);
  });

  await t.test('Customer role is restricted from discount management', () => {
    assert.equal(canManageDiscounts('customer'), false);
    assert.equal(canManageDiscounts(null), false);
    assert.equal(canManageDiscounts(''), false);
  });
});
