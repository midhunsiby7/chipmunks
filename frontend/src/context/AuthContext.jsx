import React, { useState, useEffect } from 'react';
import { AuthContext } from './authContextInstance';
import { authService } from '../services/authService';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('brightloop_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firebase Auth state updates
    const unsubscribe = authService.onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'Brightloop User',
          role: 'admin', // Default role until backend maps role in Phase 2
        });
      } else {
        const cachedUser = localStorage.getItem('brightloop_user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    // Listen for unauthorized 401 events dispatched by centralized apiClient
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('brightloop:unauthorized', handleUnauthorized);

    return () => {
      unsubscribe();
      window.removeEventListener('brightloop:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = (authToken, userData) => {
    localStorage.setItem('brightloop_token', authToken);
    if (userData) {
      localStorage.setItem('brightloop_user', JSON.stringify(userData));
    }
    setToken(authToken);
    setUser(userData);
  };

  const logout = async () => {
    await authService.signOutUser();
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    role: user?.role || 'admin',
    isAuthenticated: !!token || !!user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
