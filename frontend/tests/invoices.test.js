import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INVOICE_STATUSES,
  getInvoiceStatusBadge,
  isInvoiceOverdue,
  canCancelInvoice,
  validateInvoicePayload,
  calculateEstimatedInvoiceTotals,
} from '../src/utils/invoiceValidation.js';

test('Invoice Payload Validation', async (t) => {
  await t.test('accepts valid invoice creation payload meeting all constraints', () => {
    const payload = {
      customer_id: '11111111-1111-1111-1111-111111111111',
      due_date: '2026-11-30T00:00:00Z',
      currency: 'USD',
      lines: [
        {
          description: 'SaaS Enterprise Subscription - Monthly',
          quantity: 2,
          unit_price: 150.0,
        },
        {
          description: 'Onboarding & Migration Services',
          quantity: 1,
          unit_price: 300.0,
        },
      ],
    };
    const res = validateInvoicePayload(payload);
    assert.equal(res.isValid, true);
    assert.deepEqual(res.errors, {});
  });

  await t.test('rejects missing or empty customer_id', () => {
    const res = validateInvoicePayload({
      customer_id: '',
      due_date: '2026-11-30T00:00:00Z',
      lines: [{ description: 'Item 1', quantity: 1, unit_price: 100 }],
    });
    assert.equal(res.isValid, false);
    assert.ok(res.errors.customer_id);
  });

  await t.test('rejects missing or invalid due_date', () => {
    const missingDate = validateInvoicePayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      due_date: '',
      lines: [{ description: 'Item 1', quantity: 1, unit_price: 100 }],
    });
    assert.equal(missingDate.isValid, false);
    assert.ok(missingDate.errors.due_date);

    const invalidDate = validateInvoicePayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      due_date: 'invalid-date-string',
      lines: [{ description: 'Item 1', quantity: 1, unit_price: 100 }],
    });
    assert.equal(invalidDate.isValid, false);
    assert.ok(invalidDate.errors.due_date);
  });

  await t.test('rejects missing or empty line items array', () => {
    const resEmpty = validateInvoicePayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      due_date: '2026-11-30T00:00:00Z',
      lines: [],
    });
    assert.equal(resEmpty.isValid, false);
    assert.ok(resEmpty.errors.lines);

    const resNull = validateInvoicePayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      due_date: '2026-11-30T00:00:00Z',
      lines: null,
    });
    assert.equal(resNull.isValid, false);
    assert.ok(resNull.errors.lines);
  });

  await t.test('validates each itemized line attributes strictly', () => {
    const badLines = validateInvoicePayload({
      customer_id: '11111111-1111-1111-1111-111111111111',
      due_date: '2026-11-30T00:00:00Z',
      lines: [
        { description: '', quantity: 2, unit_price: 50 },
        { description: 'Valid Item', quantity: 0, unit_price: 50 },
        { description: 'Valid Item 2', quantity: 2.5, unit_price: 50 },
        { description: 'Valid Item 3', quantity: 1, unit_price: -10 },
      ],
    });
    assert.equal(badLines.isValid, false);
    assert.ok(badLines.errors['line_0_description']);
    assert.ok(badLines.errors['line_1_quantity']);
    assert.ok(badLines.errors['line_2_quantity']);
    assert.ok(badLines.errors['line_3_price']);
  });
});

test('Invoice Status Badges and Labels', async (t) => {
  await t.test('returns appropriate visual badge metadata for all 8 backend statuses', () => {
    const statuses = [
      { status: INVOICE_STATUSES.PAID, label: 'Paid', variant: 'success', dot: true },
      { status: INVOICE_STATUSES.CONFIRMED, label: 'Confirmed', variant: 'primary', dot: true },
      { status: INVOICE_STATUSES.ISSUED, label: 'Issued', variant: 'indigo', dot: true },
      { status: INVOICE_STATUSES.PARTIALLY_PAID, label: 'Partially Paid', variant: 'warning', dot: true },
      { status: INVOICE_STATUSES.OVERDUE, label: 'Overdue', variant: 'danger', dot: true },
      { status: INVOICE_STATUSES.CANCELLED, label: 'Cancelled', variant: 'default', dot: false },
      { status: INVOICE_STATUSES.VOID, label: 'Void', variant: 'default', dot: false },
      { status: INVOICE_STATUSES.DRAFT, label: 'Draft', variant: 'default', dot: false },
    ];

    statuses.forEach(({ status, label, variant, dot }) => {
      const badge = getInvoiceStatusBadge(status);
      assert.equal(badge.label, label);
      assert.equal(badge.variant, variant);
      assert.equal(badge.dot, dot);
    });
  });

  await t.test('handles unknown and fallback statuses gracefully', () => {
    const badge = getInvoiceStatusBadge('archived_custom');
    assert.equal(badge.label, 'archived_custom');
    assert.equal(badge.variant, 'default');
  });
});

test('Invoice Overdue Detection', async (t) => {
  await t.test('identifies invoice as overdue when due date has passed with outstanding balance', () => {
    const pastDate = new Date(Date.now() - 86400000 * 5).toISOString();
    assert.equal(isInvoiceOverdue(pastDate, 250.0), true);
    assert.equal(isInvoiceOverdue(pastDate, '75.50'), true);
  });

  await t.test('does not mark as overdue if outstanding balance is zero', () => {
    const pastDate = new Date(Date.now() - 86400000 * 5).toISOString();
    assert.equal(isInvoiceOverdue(pastDate, 0), false);
    assert.equal(isInvoiceOverdue(pastDate, '0.00'), false);
  });

  await t.test('does not mark as overdue if due date is in the future', () => {
    const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
    assert.equal(isInvoiceOverdue(futureDate, 500.0), false);
  });

  await t.test('handles null or missing due date safely', () => {
    assert.equal(isInvoiceOverdue(null, 500.0), false);
    assert.equal(isInvoiceOverdue('', 500.0), false);
  });
});

test('Invoice Cancellation Permissions & Rules', async (t) => {
  await t.test('permits Admin or Staff to cancel unpaid invoice', () => {
    const invoice = { id: 'inv-1', status: 'issued', amount_paid: 0 };
    assert.equal(canCancelInvoice(invoice, 'admin'), true);
    assert.equal(canCancelInvoice(invoice, 'staff'), true);
    assert.equal(canCancelInvoice(invoice, 'ADMIN'), true);
  });

  await t.test('blocks cancellation if payments have been recorded', () => {
    const paidInvoice = { id: 'inv-2', status: 'partially_paid', amount_paid: 50.0 };
    assert.equal(canCancelInvoice(paidInvoice, 'admin'), false);
    assert.equal(canCancelInvoice(paidInvoice, 'staff'), false);
  });

  await t.test('blocks cancellation if already cancelled', () => {
    const cancelledInvoice = { id: 'inv-3', status: INVOICE_STATUSES.CANCELLED, amount_paid: 0 };
    assert.equal(canCancelInvoice(cancelledInvoice, 'admin'), false);
  });

  await t.test('strictly blocks customers from cancelling invoices', () => {
    const invoice = { id: 'inv-4', status: 'issued', amount_paid: 0 };
    assert.equal(canCancelInvoice(invoice, 'customer'), false);
    assert.equal(canCancelInvoice(invoice, 'CUSTOMER'), false);
  });
});

test('Client-side Financial Estimation Engine', async (t) => {
  await t.test('computes lines subtotal and taxes correctly', () => {
    const lines = [
      { quantity: 2, unit_price: 100 }, // 200
      { quantity: 3, unit_price: 50 },  // 150
    ];
    // Subtotal: 350
    const taxRule = { rate_percentage: 10, is_fixed: false };
    const totals = calculateEstimatedInvoiceTotals(lines, 0, taxRule);

    assert.equal(totals.subtotal, 350);
    assert.equal(totals.discountAmount, 0);
    assert.equal(totals.taxBase, 350);
    assert.equal(totals.taxAmount, 35.0);
    assert.equal(totals.totalAmount, 385.0);
  });

  await t.test('applies promotional discount deduction prior to percentage tax calculation', () => {
    const lines = [{ quantity: 1, unit_price: 200 }];
    const discountDeduction = 50; // taxable base becomes 150
    const taxRule = { rate_percentage: 10, is_fixed: false };

    const totals = calculateEstimatedInvoiceTotals(lines, discountDeduction, taxRule);

    assert.equal(totals.subtotal, 200);
    assert.equal(totals.discountAmount, 50);
    assert.equal(totals.taxBase, 150);
    assert.equal(totals.taxAmount, 15.0);
    assert.equal(totals.totalAmount, 165.0);
  });

  await t.test('correctly applies fixed tax rules', () => {
    const lines = [{ quantity: 1, unit_price: 100 }];
    const taxRule = { rate_percentage: 15, is_fixed: true };

    const totals = calculateEstimatedInvoiceTotals(lines, 0, taxRule);

    assert.equal(totals.subtotal, 100);
    assert.equal(totals.taxAmount, 15);
    assert.equal(totals.totalAmount, 115);
  });

  await t.test('safely clamps discounts exceeding subtotal and handles empty lines', () => {
    const lines = [{ quantity: 1, unit_price: 50 }];
    const totals = calculateEstimatedInvoiceTotals(lines, 100, null);

    assert.equal(totals.subtotal, 50);
    assert.equal(totals.discountAmount, 50);
    assert.equal(totals.taxBase, 0);
    assert.equal(totals.totalAmount, 0);

    const emptyTotals = calculateEstimatedInvoiceTotals([], 0, null);
    assert.equal(emptyTotals.subtotal, 0);
    assert.equal(emptyTotals.totalAmount, 0);
  });
});
