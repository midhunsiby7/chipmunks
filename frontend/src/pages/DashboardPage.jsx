import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminDashboardView from '../components/dashboard/AdminDashboardView';
import StaffDashboardView from '../components/dashboard/StaffDashboardView';
import CustomerDashboardView from '../components/dashboard/CustomerDashboardView';
import DashboardLoadingState from '../components/dashboard/DashboardLoadingState';

/**
 * Dynamic Role-Based Overview Dashboard Router
 *
 * Renders the dedicated dashboard view corresponding to the authoritative
 * role supplied by FastAPI backend (/api/v1/users/me):
 * - Admin: Full business command center, revenue metrics, staff provisioning
 * - Staff: Operational customer directory, pending quotes, subscription workflows
 * - Customer: Personalized self-service portal, own balance and renewals
 */
export default function DashboardPage() {
  const { role, loading } = useAuth();

  if (loading) {
    return <DashboardLoadingState />;
  }

  const normalizedRole = role ? String(role).toLowerCase() : 'customer';

  switch (normalizedRole) {
    case 'admin':
      return <AdminDashboardView />;
    case 'staff':
      return <StaffDashboardView />;
    case 'customer':
    default:
      return <CustomerDashboardView />;
  }
}
