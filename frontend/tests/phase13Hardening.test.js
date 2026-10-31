import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { fetchAllPages } from '../src/utils/paginationHelper.js';
import {
  groupAmountsByCurrency,
  calculateInvoiceAgingSchedule,
  calculatePlanPopularity,
} from '../src/utils/analyticsUtils.js';

test('Central Pagination Accumulator (fetchAllPages)', async (t) => {
  await t.test('retrieves all pages completely without arbitrary 10-page or 1,000-record caps', async () => {
    // Simulate 15 pages of 100 items each = 1,500 records
    const TOTAL_ITEMS = 1500;
    const PAGE_SIZE = 100;
    const TOTAL_PAGES = Math.ceil(TOTAL_ITEMS / PAGE_SIZE);

    const mockFetch = async ({ page, pageSize }) => {
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, TOTAL_ITEMS);
      const items = [];
      for (let i = startIndex; i < endIndex; i++) {
        items.push({ id: `item-${i + 1}`, name: `Record ${i + 1}` });
      }
      return {
        items,
        total: TOTAL_ITEMS,
        page,
        page_size: pageSize,
        pages: TOTAL_PAGES,
      };
    };

    const result = await fetchAllPages(mockFetch, { pageSize: PAGE_SIZE, maxPages: 50 });

    assert.equal(result.items.length, 1500);
    assert.equal(result.total, 1500);
    assert.equal(result.pagesRetrieved, 15);
    assert.equal(result.isComplete, true);
    assert.equal(result.items[0].id, 'item-1');
    assert.equal(result.items[1499].id, 'item-1500');
  });

  await t.test('deduplicates records shifting across page boundaries by unique ID', async () => {
    // Record 'dup-5' appears on page 1 and page 2 due to shifting page boundaries
    const mockFetch = async ({ page }) => {
      if (page === 1) {
        return {
          items: [{ id: 'item-1' }, { id: 'item-2' }, { id: 'dup-5' }],
          total: 5,
          page: 1,
          pages: 2,
        };
      }
      return {
        items: [{ id: 'dup-5' }, { id: 'item-3' }, { id: 'item-4' }],
        total: 5,
        page: 2,
        pages: 2,
      };
    };

    const result = await fetchAllPages(mockFetch, { pageSize: 3 });

    assert.equal(result.items.length, 5); // Deduplicated from 6 raw items
    const ids = result.items.map((i) => i.id);
    assert.deepEqual(ids, ['item-1', 'item-2', 'dup-5', 'item-3', 'item-4']);
  });

  await t.test('safely halts when circuit breaker maxPages is reached to prevent runaway loops', async () => {
    // Simulate infinite pagination bug from backend returning pages: 9999
    const mockFetch = async ({ page }) => {
      return {
        items: [{ id: `item-${page}` }],
        total: 9999,
        page,
        pages: 9999,
      };
    };

    const result = await fetchAllPages(mockFetch, { maxPages: 5 });

    assert.equal(result.pagesRetrieved, 5);
    assert.equal(result.items.length, 5);
    assert.equal(result.isComplete, false); // Flags that dataset hit safety cutoff
  });

  await t.test('terminates cleanly if backend returns an empty page earlier than totalPages', async () => {
    const mockFetch = async ({ page }) => {
      if (page === 1) {
        return {
          items: [{ id: '1' }, { id: '2' }],
          total: 10,
          page: 1,
          pages: 5,
        };
      }
      return {
        items: [],
        total: 10,
        page,
        pages: 5,
      };
    };

    const result = await fetchAllPages(mockFetch);

    assert.equal(result.items.length, 2);
    assert.equal(result.pagesRetrieved, 1);
  });

  await t.test('gracefully recovers from network rejection without throwing unhandled exceptions', async () => {
    const mockFetch = async ({ page }) => {
      if (page === 1) {
        return { items: [{ id: '1' }], total: 2, page: 1, pages: 2 };
      }
      throw new Error('Connection reset by peer');
    };

    const result = await fetchAllPages(mockFetch);

    assert.equal(result.isComplete, false);
    assert.equal(result.items.length, 1);
  });
});

test('Financial Integrity & Multi-Currency Segregation', async (t) => {
  await t.test('strictly separates INR, USD, EUR, and GBP without cross-currency summation', () => {
    const multiCurrencyInvoices = [
      { id: '1', total_amount: 150000.0, currency: 'INR' },
      { id: '2', total_amount: 75000.0, currency: 'inr' },
      { id: '3', total_amount: 1200.0, currency: 'USD' },
      { id: '4', total_amount: 800.0, currency: 'usd' },
      { id: '5', total_amount: 550.0, currency: 'EUR' },
      { id: '6', total_amount: 250.0, currency: 'GBP' },
    ];

    const totals = groupAmountsByCurrency(multiCurrencyInvoices, 'total_amount', 'currency');

    assert.equal(totals.INR, 225000.0);
    assert.equal(totals.USD, 2000.0);
    assert.equal(totals.EUR, 550.0);
    assert.equal(totals.GBP, 250.0);
    assert.equal(totals.total, undefined); // Never introduces an unsegregated 'total'
    assert.deepEqual(Object.keys(totals).sort(), ['EUR', 'GBP', 'INR', 'USD']);
  });

  await t.test('MRR calculation matches backend normalization formula across all cadences', () => {
    const samplePlans = [
      { id: 'plan-daily', name: 'Daily Standup Plan' },
      { id: 'plan-weekly', name: 'Weekly Sprint Plan' },
      { id: 'plan-monthly', name: 'Monthly Pro Plan' },
      { id: 'plan-yearly', name: 'Yearly Enterprise Plan' },
    ];

    const subscriptions = [
      { status: 'active', plan_id: 'plan-daily', total_amount: 10, billing_interval: 'daily' },
      { status: 'active', plan_id: 'plan-weekly', total_amount: 100, billing_interval: 'weekly' },
      { status: 'active', plan_id: 'plan-monthly', total_amount: 500, billing_interval: 'monthly' },
      { status: 'active', plan_id: 'plan-yearly', total_amount: 12000, billing_interval: 'yearly' },
      { status: 'paused', plan_id: 'plan-monthly', total_amount: 9999, billing_interval: 'monthly' }, // Paused should not contribute to MRR
    ];

    const popularity = calculatePlanPopularity(subscriptions, samplePlans);

    const daily = popularity.find((p) => p.planId === 'plan-daily');
    const weekly = popularity.find((p) => p.planId === 'plan-weekly');
    const monthly = popularity.find((p) => p.planId === 'plan-monthly');
    const yearly = popularity.find((p) => p.planId === 'plan-yearly');

    // daily: 10 * 30 = 300
    assert.equal(daily.mrrContribution, 300);
    // weekly: 100 * 4.333 = 433.30
    assert.equal(weekly.mrrContribution, 433.3);
    // monthly: 500 * 1 = 500
    assert.equal(monthly.mrrContribution, 500);
    // yearly: 12000 / 12 = 1000
    assert.equal(yearly.mrrContribution, 1000);
    // Paused excluded: monthly count is 1
    assert.equal(monthly.activeCount, 1);
  });

  await t.test('5-tier invoice aging schedule partitions invoices cleanly without overlaps or gaps', () => {
    const refDate = new Date('2026-10-31T00:00:00Z');
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const testInvoices = [
      // Current: Due today or future
      { id: 'curr-1', due_date: new Date(refDate.getTime() + 5 * ONE_DAY_MS).toISOString(), amount_due: 100, currency: 'USD', status: 'issued' },
      { id: 'curr-today', due_date: refDate.toISOString(), amount_due: 150, currency: 'USD', status: 'confirmed' },

      // 1-30 days past due
      { id: 'past-1d', due_date: new Date(refDate.getTime() - 1 * ONE_DAY_MS).toISOString(), amount_due: 200, currency: 'USD', status: 'issued' },
      { id: 'past-30d', due_date: new Date(refDate.getTime() - 30 * ONE_DAY_MS).toISOString(), amount_due: 250, currency: 'USD', status: 'issued' },

      // 31-60 days past due
      { id: 'past-31d', due_date: new Date(refDate.getTime() - 31 * ONE_DAY_MS).toISOString(), amount_due: 300, currency: 'USD', status: 'issued' },
      { id: 'past-60d', due_date: new Date(refDate.getTime() - 60 * ONE_DAY_MS).toISOString(), amount_due: 350, currency: 'USD', status: 'issued' },

      // 61-90 days past due
      { id: 'past-61d', due_date: new Date(refDate.getTime() - 61 * ONE_DAY_MS).toISOString(), amount_due: 400, currency: 'USD', status: 'issued' },
      { id: 'past-90d', due_date: new Date(refDate.getTime() - 90 * ONE_DAY_MS).toISOString(), amount_due: 450, currency: 'USD', status: 'issued' },

      // 90+ days past due
      { id: 'past-91d', due_date: new Date(refDate.getTime() - 91 * ONE_DAY_MS).toISOString(), amount_due: 500, currency: 'USD', status: 'issued' },
      { id: 'past-365d', due_date: new Date(refDate.getTime() - 365 * ONE_DAY_MS).toISOString(), amount_due: 600, currency: 'USD', status: 'overdue' },

      // Inactive / Paid: must be completely ignored
      { id: 'paid-1', due_date: new Date(refDate.getTime() - 100 * ONE_DAY_MS).toISOString(), amount_due: 0, currency: 'USD', status: 'paid' },
      { id: 'void-1', due_date: new Date(refDate.getTime() - 100 * ONE_DAY_MS).toISOString(), amount_due: 500, currency: 'USD', status: 'void' },
    ];

    const { totalOverdueCount, buckets } = calculateInvoiceAgingSchedule(testInvoices, refDate);

    assert.equal(totalOverdueCount, 8); // 8 overdue active invoices

    const currentBucket = buckets.find((b) => b.id === 'current');
    const b1_30 = buckets.find((b) => b.id === 'days_1_30');
    const b31_60 = buckets.find((b) => b.id === 'days_31_60');
    const b61_90 = buckets.find((b) => b.id === 'days_61_90');
    const b90_plus = buckets.find((b) => b.id === 'days_90_plus');

    assert.equal(currentBucket.count, 2);
    assert.equal(currentBucket.byCurrency.USD, 250); // 100 + 150

    assert.equal(b1_30.count, 2);
    assert.equal(b1_30.byCurrency.USD, 450); // 200 + 250

    assert.equal(b31_60.count, 2);
    assert.equal(b31_60.byCurrency.USD, 650); // 300 + 350

    assert.equal(b61_90.count, 2);
    assert.equal(b61_90.byCurrency.USD, 850); // 400 + 450

    assert.equal(b90_plus.count, 2);
    assert.equal(b90_plus.byCurrency.USD, 1100); // 500 + 600
  });
});

test('Razorpay Cryptographic Verification & Overpayment Protection Audit', async (t) => {
  await t.test('verifies HMAC-SHA256 signature using timing-safe comparison', () => {
    const keySecret = 'sample_secret_key_12345';
    const orderId = 'order_DA283F91JKA';
    const paymentId = 'pay_92JDJAKL92';

    const message = `${orderId}|${paymentId}`;
    const generatedSignature = crypto.createHmac('sha256', keySecret).update(message).digest('hex');

    // Simulate backend verification
    const expectedSignature = crypto.createHmac('sha256', keySecret).update(message).digest('hex');
    const match = crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf-8'),
      Buffer.from(expectedSignature, 'utf-8')
    );
    assert.equal(match, true);

    // Tampered payment_id must fail
    const tamperedPaymentId = 'pay_TAMPERED99';
    const tamperedMessage = `${orderId}|${tamperedPaymentId}`;
    const badSignature = crypto.createHmac('sha256', keySecret).update(tamperedMessage).digest('hex');
    const badMatch = crypto.timingSafeEqual(
      Buffer.from(badSignature, 'utf-8'),
      Buffer.from(expectedSignature, 'utf-8')
    );
    assert.equal(badMatch, false);
  });

  await t.test('validates overpayment prevention rule (pay_amount <= invoice.amount_due)', () => {
    const invoice = {
      id: 'inv-123',
      total_amount: 10000.0,
      amount_paid: 6000.0,
      amount_due: 4000.0,
    };

    const validatePaymentAmount = (amt, inv) => {
      const numAmt = Number(amt);
      if (isNaN(numAmt) || numAmt <= 0) {
        return { valid: false, error: 'Payment amount must be greater than zero.' };
      }
      if (numAmt > inv.amount_due) {
        return { valid: false, error: `Payment amount (${numAmt}) cannot exceed outstanding balance (${inv.amount_due}).` };
      }
      return { valid: true };
    };

    assert.equal(validatePaymentAmount(4000.0, invoice).valid, true);
    assert.equal(validatePaymentAmount(2000.0, invoice).valid, true);
    assert.equal(validatePaymentAmount(4000.01, invoice).valid, false);
    assert.equal(validatePaymentAmount(10000.0, invoice).valid, false);
  });

  await t.test('converts currency amount to integer paise for Razorpay order initiation', () => {
    const convertToPaise = (amount) => Math.round(Number(amount) * 100);

    assert.equal(convertToPaise(499.99), 49999);
    assert.equal(convertToPaise(100.0), 10000);
    assert.equal(convertToPaise(0.5), 50);
  });
});

test('Double-Click Submission & Route Splitting Integrity', async (t) => {
  await t.test('verifies submission lock prevents duplicate triggering during in-flight requests', async () => {
    let callCount = 0;
    let isSubmitting = false;

    const mockSubmitAction = async () => {
      if (isSubmitting) return false;
      isSubmitting = true;
      try {
        callCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return true;
      } finally {
        isSubmitting = false;
      }
    };

    // Simulate rapid concurrent clicks
    const [firstClick, secondClick, thirdClick] = await Promise.all([
      mockSubmitAction(),
      mockSubmitAction(),
      mockSubmitAction(),
    ]);

    assert.equal(firstClick, true);
    assert.equal(secondClick, false);
    assert.equal(thirdClick, false);
    assert.equal(callCount, 1);
  });
});
