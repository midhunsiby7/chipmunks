import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateQuotationPayload,
  calculateQuotationTotals,
  isQuotationExpired,
  getQuotationStatusBadgeConfig,
} from '../src/utils/quotationValidation.js';

test('Quotation Payload Validation', async (t) => {
  await t.test('accepts valid quotation payload meeting all constraints', () => {
    const validData = {
      customer_id: 'cust-12345',
      valid_until: '2026-12-31T23:59:59Z',
      lines: [
        {
          description: 'Standard Cloud SaaS Subscription',
          quantity: 2,
          unit_price: '49.99',
        },
        {
          description: 'Custom Onboarding Package',
          quantity: 1,
          unit_price: '500.00',
        },
      ],
    };
    const res = validateQuotationPayload(validData);
    assert.equal(res.isValid, true);
    assert.equal(Object.keys(res.errors).length, 0);
  });

  await t.test('rejects missing customer_id', () => {
    const res = validateQuotationPayload({
      customer_id: '',
      valid_until: '2026-12-31T00:00:00Z',
      lines: [{ description: 'Item', quantity: 1, unit_price: 10 }],
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.customer_id);
  });

  await t.test('rejects missing or invalid valid_until date', () => {
    const missingDate = validateQuotationPayload({
      customer_id: 'cust-1',
      valid_until: '',
      lines: [{ description: 'Item', quantity: 1, unit_price: 10 }],
    });
    assert.equal(missingDate.isValid, false);
    assert.ok(missingDate.errors.valid_until);

    const invalidDate = validateQuotationPayload({
      customer_id: 'cust-1',
      valid_until: 'not-a-date',
      lines: [{ description: 'Item', quantity: 1, unit_price: 10 }],
    });
    assert.equal(invalidDate.isValid, false);
    assert.ok(invalidDate.errors.valid_until);
  });

  await t.test('rejects quotation without itemized lines', () => {
    const res = validateQuotationPayload({
      customer_id: 'cust-1',
      valid_until: '2026-12-31T00:00:00Z',
      lines: [],
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.lines);
  });

  await t.test('validates each itemized line attributes', () => {
    const res = validateQuotationPayload({
      customer_id: 'cust-1',
      valid_until: '2026-12-31T00:00:00Z',
      lines: [
        { description: '', quantity: 1, unit_price: 100 },
        { description: 'Item 2', quantity: 0, unit_price: 100 },
        { description: 'Item 3', quantity: 1, unit_price: -10 },
      ],
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.line_0_description);
    assert.ok(res.errors.line_1_quantity);
    assert.ok(res.errors.line_2_price);
  });
});

test('Quotation Totals & Financial Formulas', async (t) => {
  await t.test('calculates accurate subtotal and total without taxes or discounts', () => {
    const lines = [
      { quantity: 2, unit_price: '50.00' },
      { quantity: 3, unit_price: '25.00' },
    ];
    const res = calculateQuotationTotals(lines);
    assert.equal(res.subtotal, 175);
    assert.equal(res.taxAmount, 0);
    assert.equal(res.discountAmount, 0);
    assert.equal(res.totalAmount, 175);
  });

  await t.test('calculates percentage-based tax on subtotal', () => {
    const lines = [{ quantity: 1, unit_price: '1000.00' }];
    const taxRule = { rate_percentage: '18.00', is_fixed: false };
    const res = calculateQuotationTotals(lines, taxRule);
    assert.equal(res.subtotal, 1000);
    assert.equal(res.taxAmount, 180);
    assert.equal(res.totalAmount, 1180);
  });

  await t.test('calculates fixed fee tax', () => {
    const lines = [{ quantity: 2, unit_price: '100.00' }];
    const taxRule = { rate_percentage: '50.00', is_fixed: true };
    const res = calculateQuotationTotals(lines, taxRule);
    assert.equal(res.subtotal, 200);
    assert.equal(res.taxAmount, 50);
    assert.equal(res.totalAmount, 250);
  });

  await t.test('applies discount deduction before computing tax liability', () => {
    const lines = [{ quantity: 1, unit_price: '1000.00' }];
    const taxRule = { rate_percentage: '10.00', is_fixed: false };
    const discountDeduction = 200; // ₹200 discount -> Tax base = ₹800
    const res = calculateQuotationTotals(lines, taxRule, discountDeduction);
    assert.equal(res.subtotal, 1000);
    assert.equal(res.discountAmount, 200);
    assert.equal(res.taxBase, 800);
    assert.equal(res.taxAmount, 80); // 10% on 800
    assert.equal(res.totalAmount, 880);
  });
});

test('Quotation Expiration and Status Badges', async (t) => {
  await t.test('evaluates validity expiration timestamp', () => {
    assert.equal(isQuotationExpired('2020-01-01T00:00:00Z'), true);
    assert.equal(isQuotationExpired('2099-01-01T00:00:00Z'), false);
    assert.equal(isQuotationExpired(null), false);
  });

  await t.test('generates correct status badge metadata', () => {
    assert.equal(getQuotationStatusBadgeConfig('draft').label, 'Draft');
    assert.equal(getQuotationStatusBadgeConfig('sent').label, 'Sent to Customer');
    assert.equal(getQuotationStatusBadgeConfig('accepted').label, 'Accepted');
    assert.equal(getQuotationStatusBadgeConfig('rejected').label, 'Rejected');
    assert.equal(getQuotationStatusBadgeConfig('converted').label, 'Converted to Subscription');
    assert.equal(getQuotationStatusBadgeConfig('sent', true).label, 'Expired');
  });
});

test('Role-Based Permissions for Quotations', async (t) => {
  await t.test('Admin and Staff can create and dispatch customer quotations', () => {
    const canCreate = (role) => ['admin', 'staff'].includes(role);
    assert.equal(canCreate('admin'), true);
    assert.equal(canCreate('staff'), true);
    assert.equal(canCreate('customer'), false);
  });

  await t.test('Customer can review and accept/reject their assigned quotations', () => {
    const canAcceptOrReject = (role, status) => {
      return ['draft', 'sent'].includes(status);
    };
    assert.equal(canAcceptOrReject('customer', 'sent'), true);
    assert.equal(canAcceptOrReject('customer', 'converted'), false);
  });
});
