import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  getPaymentStatusBadge,
  getPaymentMethodBadge,
  validatePaymentPayload,
  calculateReconciledBalance,
  canRecordManualPayment,
  canPayOnline,
} from '../src/utils/paymentValidation.js';
import { loadRazorpayCheckout } from '../src/utils/razorpay.js';

test('Manual Payment Payload Validation', async (t) => {
  const mockInvoice = {
    id: '11111111-1111-1111-1111-111111111111',
    invoice_number: 'INV-2026-00010',
    total_amount: 500.0,
    amount_paid: 200.0,
    amount_due: 300.0,
    currency: 'USD',
  };

  await t.test('accepts valid full settlement payment payload', () => {
    const payload = {
      invoice_id: mockInvoice.id,
      amount: 300.0,
      currency: 'USD',
      payment_method: PAYMENT_METHODS.BANK_TRANSFER,
      transaction_reference: 'NEFT-2026-9901',
      notes: 'Final settlement for enterprise pilot',
    };
    const res = validatePaymentPayload(payload, mockInvoice);
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('accepts valid partial payment payload', () => {
    const payload = {
      invoice_id: mockInvoice.id,
      amount: 150.0,
      currency: 'USD',
      payment_method: PAYMENT_METHODS.CREDIT_CARD,
    };
    const res = validatePaymentPayload(payload, mockInvoice);
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('rejects missing or empty invoice_id', () => {
    const res = validatePaymentPayload({
      invoice_id: '',
      amount: 100.0,
      payment_method: PAYMENT_METHODS.CASH,
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.invoice_id);
  });

  await t.test('rejects non-positive payment amount (zero, negative, or invalid number)', () => {
    const zeroRes = validatePaymentPayload(
      { invoice_id: mockInvoice.id, amount: 0, payment_method: PAYMENT_METHODS.CASH },
      mockInvoice
    );
    assert.equal(zeroRes.isValid, false);
    assert.ok(zeroRes.errors.amount);

    const negRes = validatePaymentPayload(
      { invoice_id: mockInvoice.id, amount: -50.0, payment_method: PAYMENT_METHODS.CASH },
      mockInvoice
    );
    assert.equal(negRes.isValid, false);
    assert.ok(negRes.errors.amount);

    const nanRes = validatePaymentPayload(
      { invoice_id: mockInvoice.id, amount: 'abc', payment_method: PAYMENT_METHODS.CASH },
      mockInvoice
    );
    assert.equal(nanRes.isValid, false);
    assert.ok(nanRes.errors.amount);
  });

  await t.test('enforces overpayment prevention against invoice balance due', () => {
    // Invoice amount_due is 300.00 -> paying 300.01 or 350.00 must be rejected
    const overpayRes = validatePaymentPayload(
      {
        invoice_id: mockInvoice.id,
        amount: 350.0,
        payment_method: PAYMENT_METHODS.BANK_TRANSFER,
      },
      mockInvoice
    );
    assert.equal(overpayRes.isValid, false);
    assert.ok(overpayRes.errors.amount);
    assert.match(overpayRes.errors.amount, /exceeds invoice balance/i);
  });

  await t.test('rejects invalid or unsupported payment method', () => {
    const res = validatePaymentPayload(
      {
        invoice_id: mockInvoice.id,
        amount: 100.0,
        payment_method: 'unsupported_bitcoin_wallet',
      },
      mockInvoice
    );
    assert.equal(res.isValid, false);
    assert.ok(res.errors.payment_method);
  });

  await t.test('rejects malformed currency ISO code', () => {
    const res = validatePaymentPayload(
      {
        invoice_id: mockInvoice.id,
        amount: 100.0,
        payment_method: PAYMENT_METHODS.CASH,
        currency: 'US_DOLLARS',
      },
      mockInvoice
    );
    assert.equal(res.isValid, false);
    assert.ok(res.errors.currency);
  });
});

test('Payment Reconciliation & Balance Calculation Engine', async (t) => {
  await t.test('calculates accurate partial payment reconciliation and resulting status', () => {
    // Total 1,000, Already Paid 300, New Payment 200
    const res = calculateReconciledBalance(1000.0, 300.0, 200.0);
    assert.equal(res.updatedPaid, 500.0);
    assert.equal(res.remainingDue, 500.0);
    assert.equal(res.isFullSettlement, false);
    assert.equal(res.isOverpayment, false);
    assert.equal(res.resultingStatus, 'partially_paid');
  });

  await t.test('calculates full settlement balancing and marks status paid', () => {
    // Total 500, Already Paid 200, New Payment 300
    const res = calculateReconciledBalance(500.0, 200.0, 300.0);
    assert.equal(res.updatedPaid, 500.0);
    assert.equal(res.remainingDue, 0.0);
    assert.equal(res.isFullSettlement, true);
    assert.equal(res.isOverpayment, false);
    assert.equal(res.resultingStatus, 'paid');
  });

  await t.test('flags overpayment attempts when payment exceeds balance due', () => {
    // Total 500, Already Paid 200, New Payment 400 (exceeds total by 100)
    const res = calculateReconciledBalance(500.0, 200.0, 400.0);
    assert.equal(res.updatedPaid, 600.0);
    assert.equal(res.remainingDue, 0.0);
    assert.equal(res.isOverpayment, true);
  });

  await t.test('handles zero and null values gracefully without throwing', () => {
    const res = calculateReconciledBalance(null, undefined, 0);
    assert.equal(res.updatedPaid, 0.0);
    assert.equal(res.remainingDue, 0.0);
    assert.equal(res.isOverpayment, false);
  });
});

test('Payment Status and Method Badges', async (t) => {
  await t.test('returns correct badge configuration across all 4 payment statuses', () => {
    const statuses = [
      { status: PAYMENT_STATUSES.COMPLETED, label: 'Completed', variant: 'success', dot: true },
      { status: PAYMENT_STATUSES.PENDING, label: 'Pending', variant: 'warning', dot: true },
      { status: PAYMENT_STATUSES.FAILED, label: 'Failed', variant: 'danger', dot: false },
      { status: PAYMENT_STATUSES.REFUNDED, label: 'Refunded', variant: 'info', dot: false },
    ];

    statuses.forEach(({ status, label, variant, dot }) => {
      const badge = getPaymentStatusBadge(status);
      assert.equal(badge.label, label);
      assert.equal(badge.variant, variant);
      assert.equal(badge.dot, dot);
    });
  });

  await t.test('distinguishes online vs offline payment methods properly', () => {
    const rzp = getPaymentMethodBadge(PAYMENT_METHODS.RAZORPAY);
    assert.equal(rzp.isOnline, true);
    assert.match(rzp.label, /Razorpay/i);

    const bank = getPaymentMethodBadge(PAYMENT_METHODS.BANK_TRANSFER);
    assert.equal(bank.isOnline, false);
    assert.match(bank.label, /Bank Transfer/i);

    const cash = getPaymentMethodBadge(PAYMENT_METHODS.CASH);
    assert.equal(cash.isOnline, false);

    const card = getPaymentMethodBadge(PAYMENT_METHODS.CREDIT_CARD);
    assert.equal(card.isOnline, false);
  });
});

test('Security & Role-Based Permissions for Payments', async (t) => {
  await t.test('allows Admin and Staff to record manual offline payments', () => {
    assert.equal(canRecordManualPayment('admin'), true);
    assert.equal(canRecordManualPayment('ADMIN'), true);
    assert.equal(canRecordManualPayment('staff'), true);
    assert.equal(canRecordManualPayment('STAFF'), true);
  });

  await t.test('strictly denies Customer role from recording manual payments', () => {
    assert.equal(canRecordManualPayment('customer'), false);
    assert.equal(canRecordManualPayment('CUSTOMER'), false);
    assert.equal(canRecordManualPayment(null), false);
    assert.equal(canRecordManualPayment(''), false);
  });

  await t.test('permits Customer to pay their own unpaid invoice online', () => {
    const custUser = { id: 'cust-uuid-1', role: 'customer' };
    const ownInvoice = {
      id: 'inv-1',
      customer_id: 'cust-uuid-1',
      status: 'issued',
      amount_due: 150.0,
    };
    assert.equal(canPayOnline(ownInvoice, custUser), true);
  });

  await t.test('strictly blocks Customer from paying another customers invoice online', () => {
    const custUser = { id: 'cust-uuid-1', role: 'customer' };
    const otherInvoice = {
      id: 'inv-2',
      customer_id: 'cust-uuid-999',
      status: 'issued',
      amount_due: 150.0,
    };
    assert.equal(canPayOnline(otherInvoice, custUser), false);
  });

  await t.test('blocks online payment if invoice is already paid, cancelled, void, or zero balance', () => {
    const custUser = { id: 'cust-uuid-1', role: 'customer' };

    const paidInvoice = { id: 'inv-3', customer_id: 'cust-uuid-1', status: 'paid', amount_due: 0 };
    assert.equal(canPayOnline(paidInvoice, custUser), false);

    const cancelledInvoice = { id: 'inv-4', customer_id: 'cust-uuid-1', status: 'cancelled', amount_due: 100 };
    assert.equal(canPayOnline(cancelledInvoice, custUser), false);

    const zeroDueInvoice = { id: 'inv-5', customer_id: 'cust-uuid-1', status: 'confirmed', amount_due: 0 };
    assert.equal(canPayOnline(zeroDueInvoice, custUser), false);
  });
});

test('Razorpay Standard Checkout SDK Loader Headless Safety', async (t) => {
  await t.test('loadRazorpayCheckout resolves gracefully without crashing in headless environment', async () => {
    // In Node test environment, typeof window is undefined
    const res = await loadRazorpayCheckout();
    assert.equal(res, false);
  });
});
