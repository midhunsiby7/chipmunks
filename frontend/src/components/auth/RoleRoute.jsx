import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingIndicator from '../ui/LoadingIndicator';

/**
 * Route guard that restricts access to users possessing specific authoritative roles.
 *
 * @param {{ allowedRoles: string[], children?: React.ReactNode }} props
 */
export default function RoleRoute({ allowedRoles = [], children }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingIndicator fullPage label="Verifying role permissions..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());
  const userHasPermission = role && normalizedAllowedRoles.includes(role.toLowerCase());

  if (!userHasPermission) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          from: location,
          attemptedPath: location.pathname,
          requiredRoles: allowedRoles,
          currentRole: role,
        }}
        replace
      />
    );
  }

  return children ? children : <Outlet />;
}
