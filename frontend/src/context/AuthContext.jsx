import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextInstance';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('brightloop_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('brightloop_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Sync session with Firebase on initial mount
  useEffect(() => {
    let isSubscribed = true;

    const unsubscribe = authService.onAuthStateChange(async (fbUser) => {
      if (!isSubscribed) return;

      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const idToken = await fbUser.getIdToken();
          localStorage.setItem('brightloop_token', idToken);
          setToken(idToken);

          // Fetch authoritative profile from FastAPI backend
          const profile = await userService.getCurrentUserProfile();
          if (!isSubscribed) return;

          if (profile.is_active === false) {
            await authService.signOutUser();
            setUser(null);
            setToken(null);
            setAuthError('Your account has been deactivated. Please contact support.');
          } else {
            setUser(profile);
            localStorage.setItem('brightloop_user', JSON.stringify(profile));
            setAuthError(null);
          }
        } catch (err) {
          if (err.status === 404) {
            // Expected state during registration: Firebase identity authenticated, but PostgreSQL profile creation in flight
            console.info('[Brightloop AuthContext] User profile pending initialization in backend database.');
          } else {
            console.warn('[Brightloop AuthContext] Could not fetch backend profile on auth change:', err);
          }
          // If backend profile is not yet initialized (e.g. registration in flight), don't wipe immediately
          if (isSubscribed) {
            const cached = localStorage.getItem('brightloop_user');
            if (cached) {
              try {
                setUser(JSON.parse(cached));
              } catch {
                setUser(null);
              }
            }
          }
        }
      } else {
        setFirebaseUser(null);
        // Only clear if not in an offline dev preview session
        const cachedToken = localStorage.getItem('brightloop_token');
        if (!cachedToken) {
          setUser(null);
          setToken(null);
        }
      }

      if (isSubscribed) {
        setLoading(false);
      }
    });

    // Handle global 401 Unauthorized event from apiClient
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      setFirebaseUser(null);
      localStorage.removeItem('brightloop_token');
      localStorage.removeItem('brightloop_user');
      setAuthError('Your session has expired. Please sign in again.');
    };

    window.addEventListener('brightloop:unauthorized', handleUnauthorized);

    return () => {
      isSubscribed = false;
      unsubscribe();
      window.removeEventListener('brightloop:unauthorized', handleUnauthorized);
    };
  }, []);

  /**
   * Log in user with email and password
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail.endsWith('@brightloop.local')) {
        const demoRole = cleanEmail.split('@')[0];
        if (['admin', 'staff', 'customer'].includes(demoRole)) {
          const profile = await devSetRole(demoRole);
          setLoading(false);
          return { user: profile };
        }
      }

      const credential = await authService.loginWithEmailPassword(email, password);
      const idToken = await credential.user.getIdToken();
      setToken(idToken);
      setFirebaseUser(credential.user);

      // Fetch authoritative user profile from FastAPI backend
      let profile;
      try {
        profile = await userService.getCurrentUserProfile();
      } catch (profileErr) {
        if (profileErr.status === 404) {
          // Profile pending in PostgreSQL for this Firebase account: auto-initialize
          const fallbackName = credential.user.displayName || email.split('@')[0];
          profile = await userService.initializeCustomerProfile({
            fullName: fallbackName,
          });
        } else {
          throw profileErr;
        }
      }

      if (profile.is_active === false) {
        await authService.signOutUser();
        setUser(null);
        setToken(null);
        setFirebaseUser(null);
        const deactErr = new Error('Your account has been deactivated. Please contact support.');
        setAuthError(deactErr.message);
        throw deactErr;
      }

      setUser(profile);
      localStorage.setItem('brightloop_token', idToken);
      localStorage.setItem('brightloop_user', JSON.stringify(profile));
      return profile;
    } catch (error) {
      setAuthError(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Register a new customer
   * Workflow:
   * 1. Create user in Firebase via authService.registerCustomer
   * 2. Initialize PostgreSQL customer profile via userService.initializeCustomerProfile
   */
  const registerCustomer = useCallback(
    async ({ email, password, fullName, phoneNumber, companyName }) => {
      setLoading(true);
      setAuthError(null);
      try {
        let credential;
        try {
          credential = await authService.registerCustomer(email, password);
        } catch (regErr) {
          // If the account already exists in Firebase (e.g. from a prior registration attempt),
          // authenticate with their credentials to ensure their PostgreSQL profile exists without error
          if (regErr.code === 'auth/email-already-in-use') {
            credential = await authService.loginWithEmailPassword(email, password);
          } else {
            throw regErr;
          }
        }
        const idToken = await credential.user.getIdToken();
        setToken(idToken);
        setFirebaseUser(credential.user);
        localStorage.setItem('brightloop_token', idToken);

        // Initialize customer profile in PostgreSQL
        const profile = await userService.initializeCustomerProfile({
          fullName,
          phoneNumber,
          companyName,
        });

        setUser(profile);
        localStorage.setItem('brightloop_user', JSON.stringify(profile));
        return profile;
      } catch (error) {
        setAuthError(error.message || 'Registration failed');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Sign out current user
   */
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.signOutUser();
    } finally {
      setUser(null);
      setFirebaseUser(null);
      setToken(null);
      setAuthError(null);
      localStorage.removeItem('brightloop_token');
      localStorage.removeItem('brightloop_user');
      setLoading(false);
    }
  }, []);

  /**
   * Re-fetch the latest user profile from backend
   */
  const refreshProfile = useCallback(async () => {
    try {
      const profile = await userService.getCurrentUserProfile();
      if (profile.is_active === false) {
        await logout();
      } else {
        setUser(profile);
        localStorage.setItem('brightloop_user', JSON.stringify(profile));
      }
      return profile;
    } catch (err) {
      console.warn('[Brightloop AuthContext] Failed to refresh profile:', err);
      return null;
    }
  }, [logout]);

  /**
   * Development / Evaluation demo role switcher
   * Allows rapid role switching during offline hackathon demonstrations
   */
  const devSetRole = useCallback(async (newRole) => {
    const mockToken = `mock-token-${newRole}`;
    localStorage.setItem('brightloop_token', mockToken);
    setToken(mockToken);

    try {
      const realProfile = await userService.getCurrentUserProfile();
      if (realProfile && realProfile.id) {
        setUser(realProfile);
        localStorage.setItem('brightloop_user', JSON.stringify(realProfile));
        return realProfile;
      }
    } catch (err) {
      console.warn('[Brightloop AuthContext] Could not hydrate backend profile for demo role:', err);
    }

    const fallbackUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: `${newRole}@brightloop.local`,
      full_name: `${newRole.charAt(0).toUpperCase() + newRole.slice(1)} Evaluator`,
      role: newRole,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(fallbackUser);
    localStorage.setItem('brightloop_user', JSON.stringify(fallbackUser));
    return fallbackUser;
  }, []);

  const normalizedRole = user?.role ? String(user.role).toLowerCase() : null;
  const isAuthenticated = Boolean(user && token && user.is_active !== false);

  const value = {
    user,
    firebaseUser,
    token,
    role: normalizedRole,
    isAuthenticated,
    loading,
    authError,
    login,
    registerCustomer,
    logout,
    refreshProfile,
    devSetRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
export default AuthProvider;
