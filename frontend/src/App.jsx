import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';

import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import DashboardLoadingState from './components/dashboard/DashboardLoadingState';

// Route-Level Code Splitting for Performance Optimization
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const ModulePlaceholderPage = lazy(() => import('./pages/ModulePlaceholderPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const TaxesPage = lazy(() => import('./pages/TaxesPage'));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage'));
const DiscountsPage = lazy(() => import('./pages/DiscountsPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

import { Settings as SettingsIcon } from 'lucide-react';

function RouteSuspenseFallback() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <DashboardLoadingState />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteSuspenseFallback />}>
          <Routes>
            {/* Public Authentication & Utility Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected Application Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* 1. Overview (Accessible to Admin, Staff, Customer) */}
              <Route index element={<DashboardPage />} />

              {/* 2. Subscriptions (Accessible to Admin, Staff, Customer) */}
              <Route path="subscriptions" element={<SubscriptionsPage />} />

              {/* 3. Invoices (Accessible to Admin, Staff, Customer) */}
              <Route path="invoices" element={<InvoicesPage />} />

              {/* 4. Users & Customers Directory (Admin & Staff Only) */}
              <Route
                path="customers"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff']}>
                    <UsersPage />
                  </RoleRoute>
                }
              />
              <Route
                path="users"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff']}>
                    <UsersPage />
                  </RoleRoute>
                }
              />

              {/* 5. Products Catalog (Admin & Staff Only) */}
              <Route
                path="products"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff']}>
                    <ProductsPage />
                  </RoleRoute>
                }
              />

              {/* 6. Subscription Plans (Admin & Staff Only) */}
              <Route
                path="plans"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff']}>
                    <PlansPage />
                  </RoleRoute>
                }
              />

              {/* 7. Tax Rules Configuration (Admin & Staff Only) */}
              <Route
                path="taxes"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff']}>
                    <TaxesPage />
                  </RoleRoute>
                }
              />

              {/* 7. Quotations (Admin, Staff, Customer) */}
              <Route
                path="quotations"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff', 'customer']}>
                    <QuotationsPage />
                  </RoleRoute>
                }
              />

              {/* 8. Discounts (Admin & Staff Only) */}
              <Route
                path="discounts"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff']}>
                    <DiscountsPage />
                  </RoleRoute>
                }
              />

              {/* 9. Payments (Admin, Staff, Customer) */}
              <Route
                path="payments"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff', 'customer']}>
                    <PaymentsPage />
                  </RoleRoute>
                }
              />

              {/* 10. Profile & Settings (Admin, Staff, Customer) */}
              <Route
                path="profile"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff', 'customer']}>
                    <ProfilePage />
                  </RoleRoute>
                }
              />

              {/* 11. Advanced Analytics & Reporting (Admin & Staff Only) */}
              <Route
                path="analytics"
                element={
                  <RoleRoute allowedRoles={['admin', 'staff']}>
                    <AnalyticsPage />
                  </RoleRoute>
                }
              />

              {/* 11. Settings (Admin Only) */}
              <Route
                path="settings"
                element={
                  <RoleRoute allowedRoles={['admin']}>
                    <ModulePlaceholderPage
                      title="System Settings"
                      section="System"
                      plannedPhase="Phase 8"
                      description="Tax rules, currency formats, role-based access controls, and organization configuration."
                      icon={SettingsIcon}
                    />
                  </RoleRoute>
                }
              />

              {/* Fallback 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
