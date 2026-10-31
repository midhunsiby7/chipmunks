import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase.js';

/**
 * Maps Firebase Auth error codes into clean, end-user friendly descriptions.
 * @param {any} error
 * @returns {string}
 */
export function mapFirebaseError(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || (typeof error.message === 'string' && error.message) || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in or use another email.';
    case 'auth/user-disabled':
      return 'This account has been deactivated. Please contact your administrator.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to too many failed login attempts. Please reset your password or try again later.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please meet the security requirements.';
    case 'auth/invalid-action-code':
      return 'The password reset link is invalid or has already been used.';
    case 'auth/expired-action-code':
      return 'The password reset link has expired. Please request a new one.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please verify your internet connection.';
    case 'auth/missing-email':
      return 'An email address is required.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled in Firebase configuration.';
    default:
      if (typeof error.message === 'string' && error.message.length > 0) {
        return error.message.replace(/^Firebase:\s*/i, '');
      }
      return 'An authentication error occurred. Please try again.';
  }
}

/**
 * Reusable Firebase Authentication Service Boundary
 * Decouples React components from direct Firebase SDK imports.
 */
class AuthService {
  /**
   * Check if Firebase Auth is initialized and configured
   * @returns {boolean}
   */
  isConfigured() {
    return isFirebaseConfigured && auth !== null;
  }

  /**
   * Returns current authenticated Firebase user or null
   * @returns {import('firebase/auth').User|null}
   */
  getCurrentUser() {
    if (!this.isConfigured()) return null;
    return auth.currentUser;
  }

  /**
   * Retrieves the current user's JWT ID token for API bearer authentication.
   * @param {boolean} forceRefresh - whether to force refresh the token from Firebase
   * @returns {Promise<string|null>}
   */
  async getCurrentUserToken(forceRefresh = false) {
    if (!this.isConfigured()) {
      return localStorage.getItem('brightloop_token') || null;
    }

    const user = auth.currentUser;
    if (!user) {
      return localStorage.getItem('brightloop_token') || null;
    }

    try {
      const idToken = await user.getIdToken(forceRefresh);
      localStorage.setItem('brightloop_token', idToken);
      return idToken;
    } catch (error) {
      console.error('[Brightloop AuthService] Failed to retrieve Firebase ID token:', error);
      return localStorage.getItem('brightloop_token') || null;
    }
  }

  /**
   * Subscribes to Firebase auth state changes.
   * @param {(user: import('firebase/auth').User|null) => void} callback
   * @returns {() => void} unsubscribe function
   */
  onAuthStateChange(callback) {
    if (!this.isConfigured()) {
      // In unconfigured environment, signal completion with null or cached token state
      callback(null);
      return () => {};
    }

    return onAuthStateChanged(
      auth,
      (user) => {
        callback(user);
      },
      (error) => {
        console.error('[Brightloop AuthService] Auth state listener error:', error);
        callback(null);
      }
    );
  }

  /**
   * Registers a new customer identity in Firebase with email and password.
   * Note: This only registers the Firebase identity. Customer profile creation in PostgreSQL
   * must be completed via POST /api/v1/users/profile immediately afterward.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('firebase/auth').UserCredential>}
   */
  async registerCustomer(email, password) {
    if (!this.isConfigured()) {
      throw new Error(
        'Firebase is not configured. Please supply VITE_FIREBASE_* credentials in your .env file.'
      );
    }

    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      return credential;
    } catch (error) {
      const friendlyMessage = mapFirebaseError(error);
      const enhancedError = new Error(friendlyMessage);
      enhancedError.code = error.code;
      enhancedError.rawError = error;
      throw enhancedError;
    }
  }

  /**
   * Signs in a user with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<import('firebase/auth').UserCredential>}
   */
  async loginWithEmailPassword(email, password) {
    if (!this.isConfigured()) {
      throw new Error(
        'Firebase is not configured. Please supply VITE_FIREBASE_* credentials in your .env file.'
      );
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Ensure the ID token is immediately cached for subsequent API calls
      const token = await credential.user.getIdToken();
      localStorage.setItem('brightloop_token', token);
      return credential;
    } catch (error) {
      const friendlyMessage = mapFirebaseError(error);
      const enhancedError = new Error(friendlyMessage);
      enhancedError.code = error.code;
      enhancedError.rawError = error;
      throw enhancedError;
    }
  }

  /**
   * Dispatches a password reset email via Firebase.
   * @param {string} email
   * @returns {Promise<void>}
   */
  async sendPasswordReset(email) {
    if (!this.isConfigured()) {
      throw new Error(
        'Firebase is not configured. Please supply VITE_FIREBASE_* credentials in your .env file.'
      );
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      const friendlyMessage = mapFirebaseError(error);
      const enhancedError = new Error(friendlyMessage);
      enhancedError.code = error.code;
      enhancedError.rawError = error;
      throw enhancedError;
    }
  }

  /**
   * Verifies a password reset action code from a reset email link.
   * @param {string} actionCode - The oobCode from the URL
   * @returns {Promise<string>} The user email associated with the code
   */
  async verifyResetCode(actionCode) {
    if (!this.isConfigured()) {
      throw new Error(
        'Firebase is not configured. Please supply VITE_FIREBASE_* credentials in your .env file.'
      );
    }

    try {
      const email = await verifyPasswordResetCode(auth, actionCode);
      return email;
    } catch (error) {
      const friendlyMessage = mapFirebaseError(error);
      const enhancedError = new Error(friendlyMessage);
      enhancedError.code = error.code;
      enhancedError.rawError = error;
      throw enhancedError;
    }
  }

  /**
   * Confirms a password reset with a validated action code and the new password.
   * @param {string} actionCode - The oobCode from the URL
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async confirmNewPassword(actionCode, newPassword) {
    if (!this.isConfigured()) {
      throw new Error(
        'Firebase is not configured. Please supply VITE_FIREBASE_* credentials in your .env file.'
      );
    }

    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
    } catch (error) {
      const friendlyMessage = mapFirebaseError(error);
      const enhancedError = new Error(friendlyMessage);
      enhancedError.code = error.code;
      enhancedError.rawError = error;
      throw enhancedError;
    }
  }

  /**
   * Signs out the current user and clears local session cache.
   * @returns {Promise<void>}
   */
  async signOutUser() {
    localStorage.removeItem('brightloop_token');
    localStorage.removeItem('brightloop_user');

    if (this.isConfigured()) {
      try {
        await fbSignOut(auth);
      } catch (error) {
        console.error('[Brightloop AuthService] Error signing out from Firebase:', error);
      }
    }
  }
}

export const authService = new AuthService();
export default authService;
