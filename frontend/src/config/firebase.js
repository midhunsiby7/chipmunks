import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Firebase Client Configuration
 * Uses environment variables prefixed with VITE_ for Vite bundling.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

/**
 * Validates that all required Firebase configuration keys are provided.
 * @returns {{ isValid: boolean, missingKeys: string[] }}
 */
export function validateFirebaseConfig() {
  const requiredKeys = [
    { key: 'VITE_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
    { key: 'VITE_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
    { key: 'VITE_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
    { key: 'VITE_FIREBASE_APP_ID', value: firebaseConfig.appId },
  ];

  const missingKeys = requiredKeys
    .filter((item) => !item.value || item.value.trim() === '')
    .map((item) => item.key);

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}

let firebaseApp = null;
let firebaseAuth = null;
let isConfigured = false;

const validation = validateFirebaseConfig();

if (validation.isValid) {
  try {
    // Prevent duplicate app initialization during HMR or multiple imports
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    isConfigured = true;
  } catch (error) {
    console.error('[Brightloop Firebase] Failed to initialize Firebase SDK:', error);
  }
} else {
  // Informative warning during development when environment variables have not been populated
  console.warn(
    `[Brightloop Firebase] Firebase configuration is incomplete. Missing: ${validation.missingKeys.join(', ')}. ` +
    'Authentication features will operate in unconfigured mode until credentials are provided in .env.'
  );
}

export const app = firebaseApp;
export const auth = firebaseAuth;
export const isFirebaseConfigured = isConfigured;

export function getFirebaseConfigStatus() {
  return {
    isConfigured,
    missingKeys: validation.missingKeys,
    projectId: firebaseConfig.projectId || null,
  };
}
