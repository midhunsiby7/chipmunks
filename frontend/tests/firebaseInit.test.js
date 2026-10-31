import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateFirebaseConfig,
  getFirebaseConfigStatus,
  isFirebaseConfigured,
  app,
  auth,
} from '../src/config/firebase.js';

test('Firebase SDK Client Initialization & Verification', async (t) => {
  await t.test('Firebase configuration contains all required keys without missing fields', () => {
    const validation = validateFirebaseConfig();
    assert.equal(validation.isValid, true);
    assert.deepEqual(validation.missingKeys, []);
  });

  await t.test('Firebase config status reflects configured state and matches target project ID', () => {
    const status = getFirebaseConfigStatus();
    assert.equal(status.isConfigured, true);
    assert.equal(status.projectId, 'subscribtionmanagement');
  });

  await t.test('Firebase App and Auth instances are properly initialized with single instance', () => {
    assert.equal(isFirebaseConfigured, true);
    assert.notEqual(app, null);
    assert.notEqual(auth, null);
    assert.equal(app.options.projectId, 'subscribtionmanagement');
  });
});
