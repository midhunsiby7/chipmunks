import test from 'node:test';
import assert from 'node:assert/strict';

import { getNavItemsForRole } from '../src/routes/navConfig.js';
import {
  computeCustomerMetrics,
  isAdministrativeRoute,
  validateCustomerProfile,
} from '../src/utils/customerPortalValidation.js';
import {
  canCustomerRespond,
  canConvertToSubscription,
  canCreateOrEditQuotation,
} from '../src/utils/quotationValidation.js';
import {
  canCloseSubscription,
  canPauseSubscription,
  canResumeSubscription,
  canCancelSubscription,
  SUBSCRIPTION_STATUSES,
} from '../src/utils/subscriptionValidation.js';
import {
  canPayOnline,
  canRecordManualPayment,
} from '../src/utils/paymentValidation.js';

test('Customer Portal Navigation & Role Isolation', async (t) => {
  await t.test('Customer receives strictly self-service navigation items with custom labels', () => {
    const customerItems = getNavItemsForRole('customer');
    assert.equal(customerItems.length, 6);

    const ids = customerItems.map((item) => item.id);
    assert.deepEqual(ids, [
      'overview',
      'quotations',
      'subscriptions',
      'invoices',
      'payments',
      'profile',
    ]);

    const names = customerItems.map((item) => item.name);
    assert.deepEqual(names, [
      'Overview',
      'My Quotations',
      'My Subscriptions',
      'My Invoices',
      'My Payments',
      'My Profile',
    ]);
  });

  await t.test('Administrative navigation items are strictly hidden from Customer view', () => {
    const customerItems = getNavItemsForRole('customer');
    const customerIds = customerItems.map((item) => item.id);

    const prohibitedIds = [
      'customers',
      'products',
      'plans',
      'taxes',
      'discounts',
      'analytics',
      'settings',
    ];

    prohibitedIds.forEach((id) => {
      assert.ok(
        !customerIds.includes(id),
        `Administrative item '${id}' must not be accessible to customer`
      );
    });
  });

  await t.test('Admin and Staff navigation contain their respective operational links', () => {
    const adminItems = getNavItemsForRole('admin');
    const staffItems = getNavItemsForRole('staff');

    assert.equal(adminItems.length, 13);
    assert.equal(staffItems.length, 12);

    assert.ok(adminItems.some((i) => i.id === 'settings'));
    assert.ok(!staffItems.some((i) => i.id === 'settings'));

    assert.ok(adminItems.some((i) => i.id === 'customers'));
    assert.ok(staffItems.some((i) => i.id === 'customers'));
    assert.ok(adminItems.some((i) => i.id === 'taxes'));
    assert.ok(staffItems.some((i) => i.id === 'taxes'));
  });
});

test('Customer Dashboard Metrics & Financial Aggregation', async (t) => {
  const mockSubscriptions = [
    {
      id: 'sub-1',
      status: 'active',
      next_billing_date: '2026-11-15T00:00:00Z',
    },
    {
      id: 'sub-2',
      status: 'active',
      next_billing_date: '2026-11-05T00:00:00Z',
    },
    {
      id: 'sub-3',
      status: 'paused',
      next_billing_date: '2026-12-01T00:00:00Z',
    },
  ];

  const mockQuotations = [
    { id: 'quo-1', status: 'sent', total_amount: 1200 },
    { id: 'quo-2', status: 'accepted', total_amount: 800 },
    { id: 'quo-3', status: 'sent', total_amount: 450 },
    { id: 'quo-4', status: 'draft', total_amount: 300 },
  ];

  const mockInvoices = [
    { id: 'inv-1', status: 'issued', amount_due: 500, total_amount: 500 },
    { id: 'inv-2', status: 'partially_paid', amount_due: 250, total_amount: 750 },
    { id: 'inv-3', status: 'paid', amount_due: 0, total_amount: 1000 },
    { id: 'inv-4', status: 'cancelled', amount_due: 300, total_amount: 300 },
  ];

  const mockPayments = [
    { id: 'pay-1', amount: 500, status: 'completed' },
    { id: 'pay-2', amount: 250, status: 'completed' },
  ];

  await t.test('accurately calculates active subscriptions and identifies earliest upcoming renewal', () => {
    const metrics = computeCustomerMetrics({
      subscriptions: mockSubscriptions,
      quotations: mockQuotations,
      invoices: mockInvoices,
      payments: mockPayments,
    });

    assert.equal(metrics.activeSubscriptions, 2);
    assert.equal(metrics.upcomingRenewal, '2026-11-05T00:00:00Z');
    assert.equal(metrics.activeSubsList.length, 2);
  });

  await t.test('accurately calculates pending quotations waiting for customer review', () => {
    const metrics = computeCustomerMetrics({
      subscriptions: mockSubscriptions,
      quotations: mockQuotations,
      invoices: mockInvoices,
      payments: mockPayments,
    });

    assert.equal(metrics.pendingQuotations, 2);
  });

  await t.test('accurately aggregates outstanding balance excluding paid and cancelled invoices', () => {
    const metrics = computeCustomerMetrics({
      subscriptions: mockSubscriptions,
      quotations: mockQuotations,
      invoices: mockInvoices,
      payments: mockPayments,
    });

    // 500 (issued) + 250 (partially_paid) = 750. inv-3 is paid, inv-4 is cancelled.
    assert.equal(metrics.outstandingAmount, 750.0);
    assert.equal(metrics.unpaidInvoicesCount, 2);
  });

  await t.test('gracefully handles empty customer records without fabrication', () => {
    const emptyMetrics = computeCustomerMetrics({
      subscriptions: [],
      quotations: [],
      invoices: [],
      payments: [],
    });

    assert.equal(emptyMetrics.activeSubscriptions, 0);
    assert.equal(emptyMetrics.upcomingRenewal, null);
    assert.equal(emptyMetrics.outstandingAmount, 0);
    assert.equal(emptyMetrics.unpaidInvoicesCount, 0);
    assert.equal(emptyMetrics.pendingQuotations, 0);
    assert.deepEqual(emptyMetrics.recentInvoices, []);
    assert.deepEqual(emptyMetrics.recentPayments, []);
  });
});

test('Customer Quotation Permissions & Conversion Policy', async (t) => {
  const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();
  const pastDate = new Date(Date.now() - 86400000 * 2).toISOString();

  const sentQuotation = {
    id: 'quo-101',
    status: 'sent',
    valid_until: futureDate,
  };

  const expiredQuotation = {
    id: 'quo-102',
    status: 'sent',
    valid_until: pastDate,
  };

  const acceptedQuotation = {
    id: 'quo-103',
    status: 'accepted',
    valid_until: futureDate,
  };

  await t.test('Customer can respond (accept/reject) only to sent and unexpired quotations', () => {
    assert.equal(canCustomerRespond('customer', sentQuotation), true);
    assert.equal(canCustomerRespond('customer', expiredQuotation), false);
    assert.equal(canCustomerRespond('customer', acceptedQuotation), false);
    assert.equal(canCustomerRespond('staff', sentQuotation), false);
  });

  await t.test('Customer is strictly prohibited from converting quotation to subscription', () => {
    assert.equal(canConvertToSubscription('customer', acceptedQuotation), false);
    assert.equal(canConvertToSubscription('staff', acceptedQuotation), true);
    assert.equal(canConvertToSubscription('admin', acceptedQuotation), true);
  });

  await t.test('Customer is prohibited from creating or editing quotations', () => {
    assert.equal(canCreateOrEditQuotation('customer'), false);
    assert.equal(canCreateOrEditQuotation('staff'), true);
    assert.equal(canCreateOrEditQuotation('admin'), true);
  });
});

test('Customer Subscription Permissions & Lifecycle Controls', async (t) => {
  const activeSub = { id: 'sub-01', status: SUBSCRIPTION_STATUSES.ACTIVE };
  const pausedSub = { id: 'sub-02', status: SUBSCRIPTION_STATUSES.PAUSED };
  const closedSub = { id: 'sub-03', status: SUBSCRIPTION_STATUSES.CLOSED };
  const cancelledSub = { id: 'sub-04', status: SUBSCRIPTION_STATUSES.CANCELLED };

  await t.test('Customer can pause active subscription', () => {
    assert.equal(canPauseSubscription(activeSub), true);
    assert.equal(canPauseSubscription(pausedSub), false);
  });

  await t.test('Customer can resume paused subscription', () => {
    assert.equal(canResumeSubscription(pausedSub), true);
    assert.equal(canResumeSubscription(activeSub), false);
  });

  await t.test('Customer can cancel active or paused subscription, but not already closed/cancelled', () => {
    assert.equal(canCancelSubscription(activeSub), true);
    assert.equal(canCancelSubscription(pausedSub), true);
    assert.equal(canCancelSubscription(closedSub), false);
    assert.equal(canCancelSubscription(cancelledSub), false);
  });

  await t.test('Customer is strictly prohibited from administratively closing subscriptions', () => {
    assert.equal(canCloseSubscription(activeSub, 'customer'), false);
    assert.equal(canCloseSubscription(pausedSub, 'customer'), false);
    assert.equal(canCloseSubscription(activeSub, 'staff'), true);
    assert.equal(canCloseSubscription(activeSub, 'admin'), true);
  });
});

test('Customer Invoice Payment Eligibility & Ownership Rules', async (t) => {
  const customerUser = {
    id: 'user-cust-001',
    role: 'customer',
    email: 'client@example.com',
  };

  const otherCustomerUser = {
    id: 'user-cust-002',
    role: 'customer',
    email: 'other@example.com',
  };

  const staffUser = {
    id: 'user-staff-001',
    role: 'staff',
    email: 'staff@brightloop.io',
  };

  const ownedUnpaidInvoice = {
    id: 'inv-101',
    customer_id: 'user-cust-001',
    status: 'issued',
    amount_due: 450.0,
    total_amount: 450.0,
  };

  const ownedPaidInvoice = {
    id: 'inv-102',
    customer_id: 'user-cust-001',
    status: 'paid',
    amount_due: 0,
    total_amount: 450.0,
  };

  const ownedCancelledInvoice = {
    id: 'inv-103',
    customer_id: 'user-cust-001',
    status: 'cancelled',
    amount_due: 450.0,
    total_amount: 450.0,
  };

  await t.test('Customer can pay online for their own unpaid invoice', () => {
    assert.equal(canPayOnline(ownedUnpaidInvoice, customerUser), true);
  });

  await t.test('Customer CANNOT pay for another customer\'s invoice', () => {
    assert.equal(canPayOnline(ownedUnpaidInvoice, otherCustomerUser), false);
  });

  await t.test('Customer CANNOT pay for already paid or cancelled invoices', () => {
    assert.equal(canPayOnline(ownedPaidInvoice, customerUser), false);
    assert.equal(canPayOnline(ownedCancelledInvoice, customerUser), false);
  });

  await t.test('Customer is strictly prohibited from recording manual offline payments', () => {
    assert.equal(canRecordManualPayment('customer'), false);
    assert.equal(canRecordManualPayment('staff'), true);
    assert.equal(canRecordManualPayment('admin'), true);
  });

  await t.test('Staff and Admin can initiate checkout for test demonstrations', () => {
    assert.equal(canPayOnline(ownedUnpaidInvoice, staffUser), true);
  });
});

test('Customer Profile Validation & Administrative Path Protection', async (t) => {
  await t.test('detects administrative paths strictly restricted from customers', () => {
    assert.equal(isAdministrativeRoute('/customers'), true);
    assert.equal(isAdministrativeRoute('/products'), true);
    assert.equal(isAdministrativeRoute('/plans'), true);
    assert.equal(isAdministrativeRoute('/taxes'), true);
    assert.equal(isAdministrativeRoute('/discounts'), true);
    assert.equal(isAdministrativeRoute('/settings'), true);
    assert.equal(isAdministrativeRoute('/analytics'), true);
    assert.equal(isAdministrativeRoute('/'), false);
    assert.equal(isAdministrativeRoute('/subscriptions'), false);
    assert.equal(isAdministrativeRoute('/quotations'), false);
    assert.equal(isAdministrativeRoute('/invoices'), false);
    assert.equal(isAdministrativeRoute('/payments'), false);
    assert.equal(isAdministrativeRoute('/profile'), false);
  });

  await t.test('validates customer profile completeness and identifies missing attributes', () => {
    const completeUser = {
      email: 'alex@example.com',
      full_name: 'Alex Johnson',
      phone_number: '+1 (555) 019-2834',
      company_name: 'Apex Innovations LLC',
    };
    const validRes = validateCustomerProfile(completeUser);
    assert.equal(validRes.isComplete, true);
    assert.deepEqual(validRes.missingFields, []);

    const incompleteUser = {
      email: 'alex@example.com',
      full_name: '',
      phone_number: null,
      company_name: '   ',
    };
    const invalidRes = validateCustomerProfile(incompleteUser);
    assert.equal(invalidRes.isComplete, false);
    assert.deepEqual(invalidRes.missingFields, ['full_name', 'phone_number', 'company_name']);
  });
});
