import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('brightloop_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial verification of stored token (PLANNED auth verification)
    if (token) {
      // In future: verify token against /api/v1/auth/me
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (authToken, userData) => {
    localStorage.setItem('brightloop_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('brightloop_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
