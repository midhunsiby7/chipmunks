import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../config/firebase';

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
      // Fallback to locally stored token during development if Firebase is unconfigured
      return localStorage.getItem('brightloop_token') || null;
    }

    const user = auth.currentUser;
    if (!user) {
      return localStorage.getItem('brightloop_token') || null;
    }

    try {
      const idToken = await user.getIdToken(forceRefresh);
      return idToken;
    } catch (error) {
      console.error('[Brightloop AuthService] Failed to retrieve Firebase ID token:', error);
      return null;
    }
  }

  /**
   * Subscribes to Firebase auth state changes.
   * @param {(user: import('firebase/auth').User|null) => void} callback
   * @returns {() => void} unsubscribe function
   */
  onAuthStateChange(callback) {
    if (!this.isConfigured()) {
      // If Firebase is not configured, simulate initial unauthenticated state
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
        throw error;
      }
    }
  }
}

export const authService = new AuthService();
export default authService;
