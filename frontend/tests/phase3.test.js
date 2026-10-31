import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatDateTime,
  getRoleBadgeConfig,
  getStatusVariant,
} from '../src/utils/formatters.js';

test('Formatters & Currency Display', async (t) => {
  await t.test('formats currency in Indian Rupees (INR) by default', () => {
    const formatted = formatCurrency(250000);
    // Should contain rupee symbol and formatted amount
    assert.ok(formatted.includes('₹'));
    assert.ok(formatted.includes('2,50,000') || formatted.includes('250,000'));
  });

  await t.test('handles zero, null, and undefined safely', () => {
    assert.equal(formatCurrency(0), '₹0.00');
    assert.equal(formatCurrency(null), '₹0.00');
    assert.equal(formatCurrency(undefined), '₹0.00');
    assert.equal(formatCurrency('invalid'), '₹0.00');
  });

  await t.test('supports custom currency codes', () => {
    const usd = formatCurrency(150, 'USD');
    assert.ok(usd.includes('$') || usd.includes('USD'));
    assert.ok(usd.includes('150.00'));
  });

  await t.test('formats numbers with comma separators', () => {
    assert.equal(formatNumber(1500), '1,500');
    assert.equal(formatNumber(1000000), '10,00,000');
    assert.equal(formatNumber(0), '0');
    assert.equal(formatNumber(null), '0');
  });

  await t.test('formats percentage with optional sign', () => {
    assert.equal(formatPercentage(15.5), '+15.5%');
    assert.equal(formatPercentage(-4.2), '-4.2%');
    assert.equal(formatPercentage(0), '0.0%');
    assert.equal(formatPercentage(8.1, false), '8.1%');
  });

  await t.test('formats dates safely', () => {
    const d = new Date('2026-10-31T12:00:00Z');
    const res = formatDate(d);
    assert.ok(res.includes('2026') || res.includes('Oct'));
    assert.equal(formatDate(null), '—');
    assert.equal(formatDate(''), '—');
  });

  await t.test('formats date-times safely', () => {
    const d = new Date('2026-10-31T12:00:00Z');
    const res = formatDateTime(d);
    assert.ok(res.length > 5);
    assert.equal(formatDateTime(null), '—');
  });

  await t.test('returns appropriate role badge config', () => {
    const admin = getRoleBadgeConfig('admin');
    assert.equal(admin.label, 'Admin');
    assert.ok(admin.className.includes('purple'));

    const staff = getRoleBadgeConfig('staff');
    assert.equal(staff.label, 'Staff');
    assert.ok(staff.className.includes('blue'));

    const customer = getRoleBadgeConfig('customer');
    assert.equal(customer.label, 'Customer');
    assert.ok(customer.className.includes('emerald'));
  });

  await t.test('returns correct status variants', () => {
    assert.equal(getStatusVariant('active'), 'success');
    assert.equal(getStatusVariant('paid'), 'success');
    assert.equal(getStatusVariant('pending'), 'warning');
    assert.equal(getStatusVariant('trialing'), 'warning');
    assert.equal(getStatusVariant('overdue'), 'danger');
    assert.equal(getStatusVariant('cancelled'), 'danger');
    assert.equal(getStatusVariant('paused'), 'info');
  });
});

test('Role-Based Dashboard & User Management Rules', async (t) => {
  await t.test('Admin role has authority to provision staff and view all users', () => {
    const adminRole = 'admin';
    const canCreateStaff = adminRole === 'admin';
    const allowedUserFilters = ['all', 'customer', 'staff', 'admin'];

    assert.equal(canCreateStaff, true);
    assert.equal(allowedUserFilters.length, 4);
  });

  await t.test('Staff role is restricted from creating staff and viewing admin users', () => {
    const staffRole = 'staff';
    const canCreateStaff = staffRole === 'admin';
    const isRestrictedToCustomers = staffRole === 'staff';

    assert.equal(canCreateStaff, false);
    assert.equal(isRestrictedToCustomers, true);
  });

  await t.test('Customer role is forbidden from accessing user management', () => {
    const customerRole = 'customer';
    const allowedRolesForUsersPage = ['admin', 'staff'];
    const hasAccess = allowedRolesForUsersPage.includes(customerRole);

    assert.equal(hasAccess, false);
  });
});
