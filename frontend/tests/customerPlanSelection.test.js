import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateSubscriptionPayload,
  calculateEstimatedSubscriptionFinancials,
} from '../src/utils/subscriptionValidation.js';
import { canPayOnline } from '../src/utils/paymentValidation.js';

test('Customer Plan Selection & Self-Service Subscription Flow', async (t) => {
  const mockPlan = {
    id: 'plan-starter-uuid',
    name: 'Starter Cloud',
    code: 'PLAN-STARTER-M',
    price: '49.00',
    currency: 'USD',
    billing_interval: 'monthly',
    interval_count: 1,
    trial_period_days: 7,
    minimum_quantity: 1,
    is_active: true,
  };

  const customerUser = {
    id: 'cust-123-uuid',
    email: 'customer@brightloop.local',
    role: 'customer',
  };

  await t.test('accepts valid self-service subscription payload for authenticated customer', () => {
    const payload = {
      customer_id: customerUser.id,
      plan_id: mockPlan.id,
      quantity: 1,
      payment_terms: 'due_on_receipt',
      trial_days: 7,
      lines: [],
    };

    const result = validateSubscriptionPayload(payload, mockPlan);
    assert.equal(result.isValid, true);
    assert.deepEqual(result.errors, {});
  });

  await t.test('enforces plan minimum_quantity during self-service subscription', () => {
    const enterprisePlan = {
      ...mockPlan,
      minimum_quantity: 5,
    };

    const payload = {
      customer_id: customerUser.id,
      plan_id: enterprisePlan.id,
      quantity: 2,
    };

    const result = validateSubscriptionPayload(payload, enterprisePlan);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.quantity.includes('Minimum required quantity'));
  });

  await t.test('calculates accurate financials for plan with promotional discount', () => {
    const financials = calculateEstimatedSubscriptionFinancials(
      mockPlan,
      2, // 2 * $49 = $98
      [],
      18, // $18 discount deduction
      { rate_percentage: 10, is_fixed: false } // 10% tax on ($98 - $18) = $80 -> $8 tax
    );

    assert.equal(financials.subtotal, 98);
    assert.equal(financials.discountAmount, 18);
    assert.equal(financials.taxAmount, 8);
    assert.equal(financials.totalAmount, 88);
  });
});

test('Customer Razorpay Online Payment Guardrails', async (t) => {
  const customerUser = {
    id: 'cust-123-uuid',
    email: 'customer@brightloop.local',
    role: 'customer',
  };

  const otherUser = {
    id: 'cust-other-uuid',
    email: 'other@brightloop.local',
    role: 'customer',
  };

  const unpaidInvoice = {
    id: 'inv-001',
    customer_id: customerUser.id,
    status: 'issued',
    amount_due: '88.00',
    total_amount: '88.00',
  };

  await t.test('allows customer to pay online for their own invoice with active balance', () => {
    assert.equal(canPayOnline(unpaidInvoice, customerUser), true);
  });

  await t.test('prohibits customer from paying another customer invoice', () => {
    assert.equal(canPayOnline(unpaidInvoice, otherUser), false);
  });

  await t.test('prohibits payment on already paid or cancelled invoices', () => {
    const paidInvoice = { ...unpaidInvoice, status: 'paid', amount_due: '0.00' };
    const cancelledInvoice = { ...unpaidInvoice, status: 'cancelled', amount_due: '88.00' };

    assert.equal(canPayOnline(paidInvoice, customerUser), false);
    assert.equal(canPayOnline(cancelledInvoice, customerUser), false);
  });
});
