import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingIndicator from '../ui/LoadingIndicator';

/**
 * Route guard that ensures the user is authenticated with a valid, active session.
 * Unauthenticated users are redirected to /login with their attempted location preserved.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingIndicator fullPage label="Verifying Brightloop credentials..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
