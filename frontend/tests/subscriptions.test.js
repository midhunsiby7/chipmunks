import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSubscriptionPayload,
  getSubscriptionStatusBadge,
  isSubscriptionExpired,
  canPauseSubscription,
  canResumeSubscription,
  canCancelSubscription,
  canCloseSubscription,
  calculateEstimatedSubscriptionFinancials,
} from '../src/utils/subscriptionValidation.js';

test('Subscription Payload Validation', async (t) => {
  await t.test('accepts valid subscription payload meeting all constraints', () => {
    const payload = {
      customer_id: '11111111-1111-1111-1111-111111111111',
      plan_id: '22222222-2222-2222-2222-222222222222',
      quantity: 5,
      payment_terms: 'due_on_receipt',
      start_date: '2026-11-01T00:00:00Z',
      trial_days: 14,
      notes: 'Provisioned for enterprise pilot',
    };
    const res = validateSubscriptionPayload(payload);
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('rejects missing or empty customer_id', () => {
    const res = validateSubscriptionPayload({
      customer_id: '',
      plan_id: '22222222-2222-2222-2222-222222222222',
      quantity: 1,
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.customer_id);
  });

  await t.test('rejects missing or empty plan_id', () => {
    const res = validateSubscriptionPayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      plan_id: '',
      quantity: 1,
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.plan_id);
  });

  await t.test('rejects non-positive or non-integer quantity', () => {
    const zeroRes = validateSubscriptionPayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      plan_id: '22222222-2222-2222-2222-222222222222',
      quantity: 0,
    });
    assert.equal(zeroRes.isValid, false);
    assert.ok(zeroRes.errors.quantity);

    const floatRes = validateSubscriptionPayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      plan_id: '22222222-2222-2222-2222-222222222222',
      quantity: 2.5,
    });
    assert.equal(floatRes.isValid, false);
    assert.ok(floatRes.errors.quantity);
  });

  await t.test('enforces plan minimum_quantity requirement', () => {
    const mockPlan = {
      name: 'Team Tier',
      minimum_quantity: 5,
    };
    const res = validateSubscriptionPayload(
      {
        customer_id: '11111111-1111-1111-1111-111111111111',
        plan_id: '22222222-2222-2222-2222-222222222222',
        quantity: 3,
      },
      mockPlan
    );
    assert.equal(res.isValid, false);
    assert.ok(res.errors.quantity.includes('Minimum required quantity'));
  });

  await t.test('validates supplementary product variant lines', () => {
    const res = validateSubscriptionPayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      plan_id: '22222222-2222-2222-2222-222222222222',
      quantity: 1,
      lines: [
        { description: '', quantity: 1, unit_price: 100 },
        { description: 'Add-on', quantity: 0, unit_price: 50 },
        { description: 'Feature', quantity: 1, unit_price: -10 },
      ],
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.line_0_description);
    assert.ok(res.errors.line_1_quantity);
    assert.ok(res.errors.line_2_price);
  });
});

test('Subscription Status Badges & Expiry Evaluation', async (t) => {
  await t.test('resolves correct badge configuration across all lifecycle statuses', () => {
    const active = getSubscriptionStatusBadge('active');
    assert.equal(active.label, 'Active');
    assert.equal(active.dot, true);
    assert.equal(active.color, 'emerald');

    const paused = getSubscriptionStatusBadge('paused');
    assert.equal(paused.label, 'Paused');
    assert.equal(paused.color, 'amber');

    const cancelled = getSubscriptionStatusBadge('cancelled');
    assert.equal(cancelled.label, 'Cancelled');
    assert.equal(cancelled.color, 'red');

    const closed = getSubscriptionStatusBadge('closed');
    assert.equal(closed.label, 'Closed');
    assert.equal(closed.color, 'slate');

    const trialing = getSubscriptionStatusBadge('trialing');
    assert.equal(trialing.label, 'Trialing');
    assert.equal(trialing.color, 'blue');

    const expired = getSubscriptionStatusBadge('expired');
    assert.equal(expired.label, 'Expired');
    assert.equal(expired.color, 'red');
  });

  await t.test('correctly evaluates subscription expiry timestamp', () => {
    const past = new Date(Date.now() - 100000).toISOString();
    const future = new Date(Date.now() + 100000).toISOString();

    assert.equal(isSubscriptionExpired(past), true);
    assert.equal(isSubscriptionExpired(future), false);
    assert.equal(isSubscriptionExpired(null), false);
  });
});

test('Subscription Lifecycle Transition Policies', async (t) => {
  await t.test('allows pause only for active subscriptions', () => {
    assert.equal(canPauseSubscription({ status: 'active' }), true);
    assert.equal(canPauseSubscription({ status: 'paused' }), false);
    assert.equal(canPauseSubscription({ status: 'cancelled' }), false);
    assert.equal(canPauseSubscription({ status: 'closed' }), false);
  });

  await t.test('allows resume only for paused subscriptions', () => {
    assert.equal(canResumeSubscription({ status: 'paused' }), true);
    assert.equal(canResumeSubscription({ status: 'active' }), false);
    assert.equal(canResumeSubscription({ status: 'cancelled' }), false);
  });

  await t.test('allows cancellation for active or paused subscriptions but not already cancelled/closed', () => {
    assert.equal(canCancelSubscription({ status: 'active' }), true);
    assert.equal(canCancelSubscription({ status: 'paused' }), true);
    assert.equal(canCancelSubscription({ status: 'trialing' }), true);
    assert.equal(canCancelSubscription({ status: 'cancelled' }), false);
    assert.equal(canCancelSubscription({ status: 'closed' }), false);
  });

  await t.test('allows closure only for Admin/Staff and non-closed subscriptions', () => {
    assert.equal(canCloseSubscription({ status: 'active' }, 'admin'), true);
    assert.equal(canCloseSubscription({ status: 'active' }, 'staff'), true);
    assert.equal(canCloseSubscription({ status: 'active' }, 'customer'), false);
    assert.equal(canCloseSubscription({ status: 'closed' }, 'admin'), false);
  });
});

test('Subscription Financial Formulas Preview Engine', async (t) => {
  await t.test('calculates base plan totals with quantity multiplier', () => {
    const plan = { price: 1500 };
    const res = calculateEstimatedSubscriptionFinancials(plan, 3);
    assert.equal(res.subtotal, 4500);
    assert.equal(res.taxAmount, 0);
    assert.equal(res.totalAmount, 4500);
  });

  await t.test('incorporates additional line items into subtotal', () => {
    const plan = { price: 1000 };
    const lines = [
      { quantity: 2, unit_price: 250 },
      { quantity: 1, unit_price: 500 },
    ];
    const res = calculateEstimatedSubscriptionFinancials(plan, 1, lines);
    assert.equal(res.subtotal, 2000);
    assert.equal(res.totalAmount, 2000);
  });

  await t.test('applies promotional discount before percentage tax', () => {
    const plan = { price: 2000 };
    const taxRule = { name: 'GST 18%', rate_percentage: 18, is_fixed: false };
    const res = calculateEstimatedSubscriptionFinancials(plan, 1, [], 500, taxRule);

    assert.equal(res.subtotal, 2000);
    assert.equal(res.discountAmount, 500);
    assert.equal(res.taxBase, 1500);
    assert.equal(res.taxAmount, 270);
    assert.equal(res.totalAmount, 1770);
  });

  await t.test('calculates fixed fee tax accurately', () => {
    const plan = { price: 1000 };
    const taxRule = { name: 'Flat Levy', rate_percentage: 100, is_fixed: true };
    const res = calculateEstimatedSubscriptionFinancials(plan, 1, [], 0, taxRule);

    assert.equal(res.subtotal, 1000);
    assert.equal(res.taxAmount, 100);
    assert.equal(res.totalAmount, 1100);
  });
});
