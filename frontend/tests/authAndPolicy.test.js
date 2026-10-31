import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePassword } from '../src/utils/passwordPolicy.js';
import { mapFirebaseError } from '../src/services/authService.js';
import { getNavItemsForRole } from '../src/routes/navConfig.js';

test('Password Security Policy Validation', async (t) => {
  await t.test('rejects passwords shorter than 9 characters', () => {
    const res = validatePassword('Ab1!');
    assert.equal(res.isValid, false);
    assert.equal(res.criteria.minLength, false);
    assert.ok(res.errors.some((e) => e.includes('9 characters')));
  });

  await t.test('rejects passwords without uppercase letters', () => {
    const res = validatePassword('password123!');
    assert.equal(res.isValid, false);
    assert.equal(res.criteria.hasUpper, false);
    assert.equal(res.criteria.hasLower, true);
    assert.equal(res.criteria.hasSpecial, true);
  });

  await t.test('rejects passwords without lowercase letters', () => {
    const res = validatePassword('PASSWORD123!');
    assert.equal(res.isValid, false);
    assert.equal(res.criteria.hasLower, false);
    assert.equal(res.criteria.hasUpper, true);
  });

  await t.test('rejects passwords without special characters', () => {
    const res = validatePassword('Password123');
    assert.equal(res.isValid, false);
    assert.equal(res.criteria.hasSpecial, false);
  });

  await t.test('accepts compliant passwords meeting all 4 criteria', () => {
    const res = validatePassword('ValidPass1!');
    assert.equal(res.isValid, true);
    assert.equal(res.criteria.minLength, true);
    assert.equal(res.criteria.hasUpper, true);
    assert.equal(res.criteria.hasLower, true);
    assert.equal(res.criteria.hasSpecial, true);
    assert.equal(res.errors.length, 0);
  });

  await t.test('classifies strength correctly', () => {
    const medium = validatePassword('Passw0rd!');
    assert.equal(medium.isValid, true);
    assert.equal(medium.strength, 'medium');

    const strong = validatePassword('SuperSecretP@ssword2026!');
    assert.equal(strong.isValid, true);
    assert.equal(strong.strength, 'strong');
  });
});

test('Firebase Error Code Translation', async (t) => {
  await t.test('maps invalid credentials properly', () => {
    const msg = mapFirebaseError({ code: 'auth/invalid-credential' });
    assert.match(msg, /invalid email or password/i);
  });

  await t.test('maps email already in use properly', () => {
    const msg = mapFirebaseError({ code: 'auth/email-already-in-use' });
    assert.match(msg, /already exists/i);
  });

  await t.test('maps user disabled properly', () => {
    const msg = mapFirebaseError({ code: 'auth/user-disabled' });
    assert.match(msg, /deactivated/i);
  });

  await t.test('maps too many requests properly', () => {
    const msg = mapFirebaseError({ code: 'auth/too-many-requests' });
    assert.match(msg, /too many failed/i);
  });

  await t.test('maps expired or invalid action codes', () => {
    const invalid = mapFirebaseError({ code: 'auth/invalid-action-code' });
    assert.match(invalid, /invalid or has already been used/i);

    const expired = mapFirebaseError({ code: 'auth/expired-action-code' });
    assert.match(expired, /expired/i);
  });

  await t.test('maps network errors', () => {
    const net = mapFirebaseError({ code: 'auth/network-request-failed' });
    assert.match(net, /network connection error/i);
  });
});

test('Role-Based Access Navigation Filtering', async (t) => {
  await t.test('Admin role receives all navigation items including settings and profile', () => {
    const adminItems = getNavItemsForRole('admin');
    assert.equal(adminItems.length, 13);
    assert.ok(adminItems.some((item) => item.id === 'settings'));
    assert.ok(adminItems.some((item) => item.id === 'customers'));
    assert.ok(adminItems.some((item) => item.id === 'analytics'));
    assert.ok(adminItems.some((item) => item.id === 'taxes'));
    assert.ok(adminItems.some((item) => item.id === 'profile'));
  });

  await t.test('Staff role receives operations items but excludes settings', () => {
    const staffItems = getNavItemsForRole('staff');
    assert.equal(staffItems.length, 12);
    assert.ok(!staffItems.some((item) => item.id === 'settings'));
    assert.ok(staffItems.some((item) => item.id === 'customers'));
    assert.ok(staffItems.some((item) => item.id === 'quotations'));
    assert.ok(staffItems.some((item) => item.id === 'taxes'));
    assert.ok(staffItems.some((item) => item.id === 'profile'));
  });

  await t.test('Customer role receives self-service portal items with friendly labels', () => {
    const customerItems = getNavItemsForRole('customer');
    assert.equal(customerItems.length, 6);
    const ids = customerItems.map((i) => i.id);
    assert.deepEqual(ids, ['overview', 'quotations', 'subscriptions', 'invoices', 'payments', 'profile']);
    assert.equal(customerItems.find((i) => i.id === 'quotations').name, 'My Quotations');
    assert.equal(customerItems.find((i) => i.id === 'subscriptions').name, 'My Subscriptions');
    assert.equal(customerItems.find((i) => i.id === 'invoices').name, 'My Invoices');
    assert.equal(customerItems.find((i) => i.id === 'payments').name, 'My Payments');
    assert.equal(customerItems.find((i) => i.id === 'profile').name, 'My Profile');
    assert.ok(!ids.includes('customers'));
    assert.ok(!ids.includes('settings'));
    assert.ok(!ids.includes('analytics'));
    assert.ok(!ids.includes('products'));
    assert.ok(!ids.includes('plans'));
    assert.ok(!ids.includes('taxes'));
    assert.ok(!ids.includes('discounts'));
  });
});
