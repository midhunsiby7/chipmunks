import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDateRangeBoundaries,
  filterRecordsByDateRange,
  groupAmountsByCurrency,
  calculateInvoiceAgingSchedule,
  calculatePaymentMethodBreakdown,
  calculateSubscriptionDistribution,
  calculatePlanPopularity,
  sanitizeCsvValue,
  generateCsvContent,
} from '../src/utils/analyticsUtils.js';
import { computeCustomerMetrics } from '../src/utils/customerPortalValidation.js';

test('Date Range Filter Boundary Calculations', async (t) => {
  const refDate = new Date('2026-10-31T12:00:00Z');

  await t.test('calculates today boundaries from start to end of day', () => {
    const { startDate, endDate, label } = getDateRangeBoundaries('today', null, null, refDate);
    assert.equal(label, 'Today');
    assert.equal(startDate.getDate(), refDate.getDate());
    assert.equal(startDate.getHours(), 0);
    assert.equal(startDate.getMinutes(), 0);
    assert.equal(endDate.getHours(), 23);
    assert.equal(endDate.getMinutes(), 59);
  });

  await t.test('calculates 7-day boundary relative to reference date', () => {
    const { startDate, endDate, label } = getDateRangeBoundaries('7d', null, null, refDate);
    assert.equal(label, 'Last 7 Days');
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diffDays, 7);
  });

  await t.test('calculates 30-day boundary accurately', () => {
    const { startDate, endDate, label } = getDateRangeBoundaries('30d', null, null, refDate);
    assert.equal(label, 'Last 30 Days');
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diffDays, 30);
  });

  await t.test('calculates custom range correctly with end-of-day extension', () => {
    const { startDate, endDate, label } = getDateRangeBoundaries(
      'custom',
      '2026-10-01',
      '2026-10-15',
      refDate
    );
    assert.equal(label, 'Custom Range');
    assert.equal(startDate.toISOString().slice(0, 10), '2026-10-01');
    assert.equal(endDate.getHours(), 23);
    assert.equal(endDate.getMinutes(), 59);
  });

  await t.test('handles all-time range with null boundaries', () => {
    const { startDate, endDate, label } = getDateRangeBoundaries('all');
    assert.equal(label, 'All Time');
    assert.equal(startDate, null);
    assert.equal(endDate, null);
  });

  await t.test('filters records within date boundaries accurately', () => {
    const sample = [
      { id: '1', created_at: '2026-10-05T00:00:00Z' },
      { id: '2', created_at: '2026-10-15T00:00:00Z' },
      { id: '3', created_at: '2026-10-25T00:00:00Z' },
    ];
    const filtered = filterRecordsByDateRange(
      sample,
      'created_at',
      new Date('2026-10-10T00:00:00Z'),
      new Date('2026-10-20T00:00:00Z')
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, '2');
  });
});

test('Multi-Currency Segregation & Calculations', async (t) => {
  const mixedInvoices = [
    { id: '1', total_amount: 50000, currency: 'INR' },
    { id: '2', total_amount: 25000, currency: 'INR' },
    { id: '3', total_amount: 600, currency: 'USD' },
    { id: '4', total_amount: 400, currency: 'EUR' },
  ];

  await t.test('strictly groups amounts by currency without cross-currency addition', () => {
    const grouped = groupAmountsByCurrency(mixedInvoices, 'total_amount', 'currency');
    assert.equal(grouped.INR, 75000.0);
    assert.equal(grouped.USD, 600.0);
    assert.equal(grouped.EUR, 400.0);
    assert.equal(grouped.GBP, undefined);
    assert.equal(grouped.total, undefined);
    assert.deepEqual(Object.keys(grouped).sort(), ['EUR', 'INR', 'USD']);
  });

  await t.test('handles empty and malformed records safely', () => {
    const empty = groupAmountsByCurrency([]);
    assert.deepEqual(empty, {});

    const invalid = groupAmountsByCurrency([
      { total_amount: 'abc', currency: 'USD' },
      { total_amount: -50, currency: 'USD' },
    ]);
    assert.deepEqual(invalid, {});
  });
});

test('Invoice Aging Schedule Breakdown', async (t) => {
  const refDate = new Date('2026-10-31T00:00:00Z');

  const invoices = [
    // 1. Current (due in 5 days)
    {
      id: 'inv-1',
      status: 'issued',
      amount_due: 1000,
      currency: 'INR',
      due_date: '2026-11-05T00:00:00Z',
    },
    // 2. Overdue 10 days (1-30 days bucket)
    {
      id: 'inv-2',
      status: 'issued',
      amount_due: 2000,
      currency: 'INR',
      due_date: '2026-10-21T00:00:00Z',
    },
    // 3. Overdue 45 days (31-60 days bucket)
    {
      id: 'inv-3',
      status: 'partially_paid',
      amount_due: 500,
      currency: 'USD',
      due_date: '2026-09-16T00:00:00Z',
    },
    // 4. Overdue 75 days (61-90 days bucket)
    {
      id: 'inv-4',
      status: 'confirmed',
      amount_due: 3000,
      currency: 'INR',
      due_date: '2026-08-17T00:00:00Z',
    },
    // 5. Overdue 100 days (90+ days bucket)
    {
      id: 'inv-5',
      status: 'overdue',
      amount_due: 4000,
      currency: 'INR',
      due_date: '2026-07-23T00:00:00Z',
    },
    // 6. Paid invoice (must be excluded from aging schedule)
    {
      id: 'inv-6',
      status: 'paid',
      amount_due: 0,
      currency: 'INR',
      due_date: '2026-08-01T00:00:00Z',
    },
    // 7. Cancelled invoice (must be excluded from aging schedule)
    {
      id: 'inv-7',
      status: 'cancelled',
      amount_due: 5000,
      currency: 'INR',
      due_date: '2026-07-01T00:00:00Z',
    },
  ];

  await t.test('categorizes unpaid invoices into 5 discrete aging buckets', () => {
    const schedule = calculateInvoiceAgingSchedule(invoices, refDate);
    assert.equal(schedule.totalOverdueCount, 4);

    const bucketMap = {};
    schedule.buckets.forEach((b) => {
      bucketMap[b.id] = b;
    });

    // Current bucket
    assert.equal(bucketMap.current.count, 1);
    assert.equal(bucketMap.current.byCurrency.INR, 1000);

    // 1 - 30 days
    assert.equal(bucketMap.days_1_30.count, 1);
    assert.equal(bucketMap.days_1_30.byCurrency.INR, 2000);

    // 31 - 60 days
    assert.equal(bucketMap.days_31_60.count, 1);
    assert.equal(bucketMap.days_31_60.byCurrency.USD, 500);

    // 61 - 90 days
    assert.equal(bucketMap.days_61_90.count, 1);
    assert.equal(bucketMap.days_61_90.byCurrency.INR, 3000);

    // 90+ days
    assert.equal(bucketMap.days_90_plus.count, 1);
    assert.equal(bucketMap.days_90_plus.byCurrency.INR, 4000);
  });
});

test('Subscription Analytics Distribution & Plan Popularity', async (t) => {
  const subscriptions = [
    { id: '1', status: 'active', billing_interval: 'monthly', plan_id: 'plan-pro', total_amount: 999 },
    { id: '2', status: 'active', billing_interval: 'yearly', plan_id: 'plan-pro', total_amount: 9999 },
    { id: '3', status: 'active', billing_interval: 'monthly', plan_id: 'plan-basic', total_amount: 299 },
    { id: '4', status: 'paused', billing_interval: 'monthly', plan_id: 'plan-basic', total_amount: 299 },
    { id: '5', status: 'closed', billing_interval: 'weekly', plan_id: 'plan-trial', total_amount: 100 },
  ];

  const plans = [
    { id: 'plan-pro', name: 'Professional Tier' },
    { id: 'plan-basic', name: 'Starter Tier' },
    { id: 'plan-trial', name: 'Trial Tier' },
  ];

  await t.test('calculates accurate status and cadence counts', () => {
    const dist = calculateSubscriptionDistribution(subscriptions);
    assert.equal(dist.total, 5);
    assert.equal(dist.byStatus.active, 3);
    assert.equal(dist.byStatus.paused, 1);
    assert.equal(dist.byStatus.closed, 1);
    assert.equal(dist.byCadence.monthly, 3);
    assert.equal(dist.byCadence.yearly, 1);
    assert.equal(dist.byCadence.weekly, 1);
  });

  await t.test('ranks plans by active subscriber volume and MRR contribution', () => {
    const ranked = calculatePlanPopularity(subscriptions, plans);
    assert.equal(ranked.length, 3);

    // Professional Tier has 2 active subs: 999 monthly + 9999/12 yearly = 999 + 833.25 = 1832.25
    const pro = ranked.find((p) => p.planId === 'plan-pro');
    assert.equal(pro.activeCount, 2);
    assert.equal(pro.mrrContribution, 1832.25);

    // Starter Tier has 1 active sub: 299 monthly
    const basic = ranked.find((p) => p.planId === 'plan-basic');
    assert.equal(basic.activeCount, 1);
    assert.equal(basic.mrrContribution, 299.0);
  });
});

test('Payment Method Breakdown & Online Gateway Reconciliation', async (t) => {
  const payments = [
    { id: 'p1', payment_method: 'razorpay', amount: 1500, currency: 'INR', status: 'completed' },
    { id: 'p2', payment_method: 'razorpay', amount: 2500, currency: 'INR', status: 'completed' },
    { id: 'p3', payment_method: 'bank_transfer', amount: 10000, currency: 'INR', status: 'completed' },
    { id: 'p4', payment_method: 'cash', amount: 500, currency: 'INR', status: 'completed' },
    { id: 'p5', payment_method: 'razorpay', amount: 1200, currency: 'INR', status: 'failed' }, // Excluded from volume
  ];

  await t.test('distinguishes online automated settlements from manual offline records', () => {
    const breakdown = calculatePaymentMethodBreakdown(payments);
    assert.equal(breakdown.totalCompletedCount, 4);
    assert.equal(breakdown.onlineCount, 2);
    assert.equal(breakdown.offlineCount, 2);
    assert.equal(breakdown.totalCompletedVolumeByCurrency.INR, 14500.0);

    const razorpayMethod = breakdown.methodBreakdown.find((m) => m.method === 'razorpay');
    assert.equal(razorpayMethod.count, 2);
    assert.equal(razorpayMethod.volumeByCurrency.INR, 4000.0);
    assert.equal(razorpayMethod.isOnline, true);
  });
});

test('CSV Export & Formula Injection (CWE-1236) Defense', async (t) => {
  await t.test('prepends apostrophe to formula trigger characters (=, +, -, @, \\t, \\r)', () => {
    assert.equal(sanitizeCsvValue('=SUM(A1:A10)'), "'=SUM(A1:A10)");
    assert.equal(sanitizeCsvValue('+CMD|/C calc'), "'+CMD|/C calc");
    assert.equal(sanitizeCsvValue('-500.00'), "'-500.00");
    assert.equal(sanitizeCsvValue('@eval(payload)'), "'@eval(payload)");
    assert.equal(sanitizeCsvValue('\tTabbedString'), "'\tTabbedString");
  });

  await t.test('escapes quotes and wraps values with commas in double quotes', () => {
    assert.equal(sanitizeCsvValue('Hello, World'), '"Hello, World"');
    assert.equal(sanitizeCsvValue('Acme "Super" Corp'), '"Acme ""Super"" Corp"');
    assert.equal(sanitizeCsvValue('Line 1\nLine 2'), '"Line 1\nLine 2"');
  });

  await t.test('leaves benign strings and numbers untouched', () => {
    assert.equal(sanitizeCsvValue('INV-2026-001'), 'INV-2026-001');
    assert.equal(sanitizeCsvValue(1500.5), '1500.5');
    assert.equal(sanitizeCsvValue(''), '');
    assert.equal(sanitizeCsvValue(null), '');
  });

  await t.test('generates complete compliant RFC 4180 CSV content', () => {
    const headers = ['Code', 'Customer', 'Amount'];
    const rows = [
      ['SUB-001', 'Apex Corp', 1500],
      ['SUB-002', '=MALICIOUS()', 2500],
      ['SUB-003', 'Special, Inc.', 3500],
    ];
    const csv = generateCsvContent(headers, rows);
    assert.ok(csv.includes("SUB-002,'=MALICIOUS(),2500"));
    assert.ok(csv.includes('SUB-003,"Special, Inc.",3500'));
  });
});

test('Customer Dashboard Pagination Completeness Audit', async (t) => {
  await t.test('uses backend total metadata when available to avoid truncated pagination', () => {
    const partialSubList = [
      { id: 'sub-1', status: 'active', next_billing_date: '2026-11-10T00:00:00Z' },
      { id: 'sub-2', status: 'active', next_billing_date: '2026-11-20T00:00:00Z' },
    ];
    // Backend reports total 25 active contracts even though page size is 2
    const metrics = computeCustomerMetrics({
      subscriptions: partialSubList,
      quotations: [],
      invoices: [],
      payments: [],
      totalActiveSubscriptions: 25,
      totalPendingQuotations: 8,
    });

    assert.equal(metrics.activeSubscriptions, 25);
    assert.equal(metrics.pendingQuotations, 8);
    assert.equal(metrics.upcomingRenewal, '2026-11-10T00:00:00Z');
  });

  await t.test('falls back to local filtered length when explicit totals are not provided', () => {
    const partialSubList = [
      { id: 'sub-1', status: 'active' },
      { id: 'sub-2', status: 'active' },
      { id: 'sub-3', status: 'paused' },
    ];
    const metrics = computeCustomerMetrics({
      subscriptions: partialSubList,
      quotations: [{ id: 'q1', status: 'sent' }],
      invoices: [],
      payments: [],
    });

    assert.equal(metrics.activeSubscriptions, 2);
    assert.equal(metrics.pendingQuotations, 1);
  });
});
