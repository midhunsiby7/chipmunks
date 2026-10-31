import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import InvoicesPage from './pages/InvoicesPage';
import ModulePlaceholderPage from './pages/ModulePlaceholderPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

import {
  Users,
  Package,
  Layers,
  FileSpreadsheet,
  Tag,
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Application Shell Routes */}
          <Route path="/" element={<MainLayout />}>
            {/* 1. Overview */}
            <Route index element={<DashboardPage />} />

            {/* 2. Subscriptions */}
            <Route path="subscriptions" element={<SubscriptionsPage />} />

            {/* 3. Invoices */}
            <Route path="invoices" element={<InvoicesPage />} />

            {/* 4. Customers (Planned Phase 3) */}
            <Route
              path="customers"
              element={
                <ModulePlaceholderPage
                  title="Customers"
                  section="Operations"
                  plannedPhase="Phase 3"
                  description="Manage customer accounts, billing contacts, and subscription assignments."
                  icon={Users}
                />
              }
            />

            {/* 5. Products (Planned Phase 3) */}
            <Route
              path="products"
              element={
                <ModulePlaceholderPage
                  title="Products"
                  section="Catalog"
                  plannedPhase="Phase 3"
                  description="Catalog of SaaS products, SKUs, and variant add-ons."
                  icon={Package}
                />
              }
            />

            {/* 6. Subscription Plans (Planned Phase 3) */}
            <Route
              path="plans"
              element={
                <ModulePlaceholderPage
                  title="Subscription Plans"
                  section="Catalog"
                  plannedPhase="Phase 3"
                  description="Configure multi-interval cadences (daily, weekly, monthly, yearly), trial periods, and currency pricing."
                  icon={Layers}
                />
              }
            />

            {/* 7. Quotations (Planned Phase 4) */}
            <Route
              path="quotations"
              element={
                <ModulePlaceholderPage
                  title="Quotations"
                  section="Sales"
                  plannedPhase="Phase 4"
                  description="Draft quotation proposals, send customer approvals, and convert accepted quotes to active subscriptions."
                  icon={FileSpreadsheet}
                />
              }
            />

            {/* 8. Discounts (Planned Phase 5) */}
            <Route
              path="discounts"
              element={
                <ModulePlaceholderPage
                  title="Discounts & Promotions"
                  section="Sales"
                  plannedPhase="Phase 5"
                  description="Define promotional codes, percentage and fixed reductions, and coupon redemption caps."
                  icon={Tag}
                />
              }
            />

            {/* 9. Payments (Planned Phase 6 / Phase 10 Razorpay) */}
            <Route
              path="payments"
              element={
                <ModulePlaceholderPage
                  title="Payments & Reconciliation"
                  section="Billing"
                  plannedPhase="Phase 6"
                  description="Record customer payments, track Razorpay test checkouts, and automatically reconcile invoice balances."
                  icon={CreditCard}
                />
              }
            />

            {/* 10. Analytics (Planned Phase 7) */}
            <Route
              path="analytics"
              element={
                <ModulePlaceholderPage
                  title="Revenue Analytics"
                  section="Intelligence"
                  plannedPhase="Phase 7"
                  description="Comprehensive MRR, ARR, churn rate curves, renewal rates, and cohort retention insights."
                  icon={BarChart3}
                />
              }
            />

            {/* 11. Settings (Planned Phase 8) */}
            <Route
              path="settings"
              element={
                <ModulePlaceholderPage
                  title="System Settings"
                  section="System"
                  plannedPhase="Phase 8"
                  description="Tax rules, currency formats, role-based access controls, and organization configuration."
                  icon={SettingsIcon}
                />
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
