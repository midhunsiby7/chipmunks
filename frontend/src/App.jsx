import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';

import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import InvoicesPage from './pages/InvoicesPage';
import ModulePlaceholderPage from './pages/ModulePlaceholderPage';
import UsersPage from './pages/UsersPage';
import ProductsPage from './pages/ProductsPage';
import PlansPage from './pages/PlansPage';
import TaxesPage from './pages/TaxesPage';
import QuotationsPage from './pages/QuotationsPage';
import DiscountsPage from './pages/DiscountsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

import {
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
                  <ModulePlaceholderPage
                    title="Payments & Reconciliation"
                    section="Billing"
                    plannedPhase="Phase 6"
                    description="Record customer payments, track Razorpay test checkouts, and automatically reconcile invoice balances."
                    icon={CreditCard}
                  />
                </RoleRoute>
              }
            />

            {/* 10. Analytics (Admin & Staff Only) */}
            <Route
              path="analytics"
              element={
                <RoleRoute allowedRoles={['admin', 'staff']}>
                  <ModulePlaceholderPage
                    title="Revenue Analytics"
                    section="Intelligence"
                    plannedPhase="Phase 7"
                    description="Comprehensive MRR, ARR, churn rate curves, renewal rates, and cohort retention insights."
                    icon={BarChart3}
                  />
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
      </BrowserRouter>
    </AuthProvider>
  );
}
