import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Skeleton } from '../components/ui/LoadingIndicator';
import AnalyticsFilterBar from '../components/analytics/AnalyticsFilterBar';
import RevenueAnalyticsView from '../components/analytics/RevenueAnalyticsView';
import SubscriptionAnalyticsView from '../components/analytics/SubscriptionAnalyticsView';
import InvoiceAgingReportView from '../components/analytics/InvoiceAgingReportView';
import PaymentAnalyticsView from '../components/analytics/PaymentAnalyticsView';
import CustomerProductInsightsView from '../components/analytics/CustomerProductInsightsView';
import TaxDiscountReportView from '../components/analytics/TaxDiscountReportView';

import { analyticsService } from '../services/analyticsService';
import {
  getDateRangeBoundaries,
  filterRecordsByDateRange,
  groupAmountsByCurrency,
  calculateInvoiceAgingSchedule,
  calculatePaymentMethodBreakdown,
  calculateSubscriptionDistribution,
  calculatePlanPopularity,
  generateCsvContent,
  downloadCsvFile,
} from '../utils/analyticsUtils';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Raw datasets from backend
  const [dashboardData, setDashboardData] = useState(null);
  const [dataset, setDataset] = useState({
    invoices: [],
    subscriptions: [],
    payments: [],
    customers: [],
    plans: [],
    products: [],
    discounts: [],
    taxRules: [],
  });
  const [snapshotTime, setSnapshotTime] = useState(0);

  // Filter States
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currency, setCurrency] = useState('all');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      analyticsService.getDashboardAnalytics(),
      analyticsService.fetchCompleteDataset(),
    ])
      .then(([dashRes, dataRes]) => {
        if (isMounted) {
          setDashboardData(dashRes);
          setDataset(dataRes);
          setSnapshotTime(Date.now());
          setLoading(false);
          setRefreshing(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[Brightloop Analytics] Failed to load reporting data:', err);
          setError(err?.response?.data?.detail || err.message || 'Failed to load executive analytics.');
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  // Derive date range boundaries
  const dateBounds = useMemo(() => {
    return getDateRangeBoundaries(dateRange, customStartDate, customEndDate);
  }, [dateRange, customStartDate, customEndDate]);

  // Apply Date and Currency filters to datasets
  const filteredData = useMemo(() => {
    const { startDate, endDate } = dateBounds;

    // Filter invoices by issue/creation date & currency
    let invs = filterRecordsByDateRange(dataset.invoices, 'issue_date', startDate, endDate);
    if (currency !== 'all') {
      invs = invs.filter((i) => (i.currency || 'USD').toUpperCase() === currency.toUpperCase());
    }

    // Filter subscriptions by start/creation date & currency
    let subs = filterRecordsByDateRange(dataset.subscriptions, 'created_at', startDate, endDate);
    if (currency !== 'all') {
      subs = subs.filter((s) => (s.currency || 'USD').toUpperCase() === currency.toUpperCase());
    }

    // Filter payments by payment date & currency
    let pays = filterRecordsByDateRange(dataset.payments, 'paid_at', startDate, endDate);
    if (currency !== 'all') {
      pays = pays.filter((p) => (p.currency || 'USD').toUpperCase() === currency.toUpperCase());
    }

    return {
      invoices: invs,
      subscriptions: subs,
      payments: pays,
    };
  }, [dataset, dateBounds, currency]);

  // Multi-Currency Financial Breakdowns
  const currencyBreakdown = useMemo(() => {
    const validInvoices = filteredData.invoices.filter((inv) => {
      const st = (inv.status || '').toLowerCase();
      return st !== 'cancelled' && st !== 'void';
    });

    const unpaidInvoices = validInvoices.filter((inv) => {
      const st = (inv.status || '').toLowerCase();
      return st !== 'paid' && Number(inv.amount_due ?? 0) > 0;
    });

    const nowMs = snapshotTime || 0;
    const overdueInvoices = unpaidInvoices.filter((inv) => {
      const dueMs = inv.due_date ? new Date(inv.due_date).getTime() : 0;
      return dueMs > 0 && dueMs < nowMs;
    });

    return {
      invoiced: groupAmountsByCurrency(validInvoices, 'total_amount', 'currency'),
      collected: groupAmountsByCurrency(filteredData.payments, 'amount', 'currency'),
      outstanding: groupAmountsByCurrency(unpaidInvoices, 'amount_due', 'currency'),
      overdue: groupAmountsByCurrency(overdueInvoices, 'amount_due', 'currency'),
    };
  }, [filteredData, snapshotTime]);

  // Aging Schedule
  const agingSchedule = useMemo(() => {
    return calculateInvoiceAgingSchedule(filteredData.invoices);
  }, [filteredData.invoices]);

  // Subscription Distributions
  const subscriptionDist = useMemo(() => {
    return calculateSubscriptionDistribution(filteredData.subscriptions);
  }, [filteredData.subscriptions]);

  // Plan Popularity
  const popularPlans = useMemo(() => {
    return calculatePlanPopularity(filteredData.subscriptions, dataset.plans);
  }, [filteredData.subscriptions, dataset.plans]);

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    return calculatePaymentMethodBreakdown(filteredData.payments);
  }, [filteredData.payments]);

  // Check if non-default filters are active
  const isFiltered = dateRange !== '30d' || currency !== 'all';

  const handleResetFilters = () => {
    setDateRange('30d');
    setCustomStartDate('');
    setCustomEndDate('');
    setCurrency('all');
  };

  // CSV Report Export Handler with Formula Injection Protection
  const handleExport = (type) => {
    const timestamp = new Date().toISOString().slice(0, 10);

    if (type === 'invoices') {
      const headers = [
        'Invoice Number',
        'Customer Name',
        'Customer Email',
        'Status',
        'Issue Date',
        'Due Date',
        'Total Amount',
        'Amount Paid',
        'Amount Due',
        'Currency',
      ];
      const rows = filteredData.invoices.map((inv) => [
        inv.invoice_number,
        inv.customer?.full_name || 'N/A',
        inv.customer?.email || 'N/A',
        inv.status,
        inv.issue_date,
        inv.due_date,
        inv.total_amount,
        inv.amount_paid,
        inv.amount_due,
        inv.currency || 'USD',
      ]);
      const csv = generateCsvContent(headers, rows);
      downloadCsvFile(`brightloop_invoices_report_${timestamp}.csv`, csv);
    } else if (type === 'subscriptions') {
      const headers = [
        'Subscription Code',
        'Customer Name',
        'Plan Name',
        'Billing Cadence',
        'Status',
        'Quantity',
        'Total Amount',
        'Start Date',
        'Next Billing Date',
        'Currency',
      ];
      const rows = filteredData.subscriptions.map((sub) => [
        sub.subscription_code,
        sub.customer?.full_name || 'N/A',
        sub.plan?.name || 'Custom Plan',
        sub.billing_interval,
        sub.status,
        sub.quantity,
        sub.total_amount,
        sub.start_date,
        sub.next_billing_date,
        sub.currency || 'USD',
      ]);
      const csv = generateCsvContent(headers, rows);
      downloadCsvFile(`brightloop_subscriptions_report_${timestamp}.csv`, csv);
    } else if (type === 'payments') {
      const headers = [
        'Payment Reference',
        'Invoice Number',
        'Customer Name',
        'Payment Method',
        'Amount',
        'Currency',
        'Status',
        'Paid Date',
        'Gateway Transaction ID',
      ];
      const rows = filteredData.payments.map((p) => [
        p.payment_reference,
        p.invoice?.invoice_number || 'N/A',
        p.customer?.full_name || 'N/A',
        p.payment_method,
        p.amount,
        p.currency || 'USD',
        p.status,
        p.paid_at,
        p.gateway_transaction_id || 'N/A',
      ]);
      const csv = generateCsvContent(headers, rows);
      downloadCsvFile(`brightloop_payments_report_${timestamp}.csv`, csv);
    } else if (type === 'summary') {
      const headers = ['Report Category', 'Metric Description', 'Value', 'Unit / Currency'];
      const rows = [
        ['Revenue', 'Contracted Monthly Recurring Revenue (MRR)', dashboardData?.mrr ?? 0, 'INR / Local'],
        ['Revenue', 'Annualized Recurring Run-Rate (ARR)', dashboardData?.arr ?? 0, 'INR / Local'],
        ['Revenue', 'Total Gross Invoiced Volume', dashboardData?.total_revenue ?? 0, 'INR / Local'],
        ['Revenue', 'Total Verified Collections', dashboardData?.total_collections ?? 0, 'INR / Local'],
        ['Receivables', 'Total Outstanding Invoice Balance', dashboardData?.outstanding_amount ?? 0, 'INR / Local'],
        ['Receivables', 'Total Overdue Balance', dashboardData?.overdue_amount ?? 0, 'INR / Local'],
        ['Receivables', 'Past Due Invoice Count', dashboardData?.overdue_invoices_count ?? 0, 'Invoices'],
        ['Subscriptions', 'Total Active Subscriptions', dashboardData?.active_subscriptions ?? 0, 'Contracts'],
        ['Subscriptions', 'Total Paused Subscriptions', dashboardData?.paused_subscriptions ?? 0, 'Contracts'],
        ['Subscriptions', 'Total Closed / Cancelled Subscriptions', dashboardData?.closed_subscriptions ?? 0, 'Contracts'],
        ['Customers', 'Total Customer Accounts', dashboardData?.total_customers ?? 0, 'Accounts'],
        ['Catalog', 'Active Products in Catalog', dashboardData?.total_products ?? 0, 'Items'],
      ];
      const csv = generateCsvContent(headers, rows);
      downloadCsvFile(`brightloop_executive_summary_${timestamp}.csv`, csv);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Revenue & Intelligence Center"
        description="Executive business intelligence, MRR/ARR trends, aging receivables, subscription health, and tabular report exports."
        breadcrumbs={[{ label: 'Brightloop', href: '/' }, { label: 'Analytics & Reporting' }]}
        badge={
          <Badge variant="primary" size="sm" className="bg-indigo-50 text-indigo-700 border-indigo-200">
            Phase 12 Intelligence
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              setRefreshTrigger((prev) => prev + 1);
            }}
            disabled={loading || refreshing}
            className="shadow-2xs text-xs flex items-center gap-1.5"
            aria-label="Refresh Analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        }
      />

      {/* Filter and Tab Controller */}
      <AnalyticsFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        customStartDate={customStartDate}
        onCustomStartDateChange={setCustomStartDate}
        customEndDate={customEndDate}
        onCustomEndDateChange={setCustomEndDate}
        currency={currency}
        onCurrencyChange={setCurrency}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExport={handleExport}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Failed to load analytics data</p>
            <p className="text-rose-700 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : (
        <div>
          {activeTab === 'overview' && (
            <RevenueAnalyticsView
              dashboardData={dashboardData}
              currencyBreakdown={currencyBreakdown}
              activeCurrency={currency}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionAnalyticsView
              subscriptions={filteredData.subscriptions}
              distribution={subscriptionDist}
              popularPlans={popularPlans}
              currency={currency}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoiceAgingReportView
              invoices={filteredData.invoices}
              agingSchedule={agingSchedule}
              currency={currency}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentAnalyticsView
              payments={filteredData.payments}
              paymentBreakdown={paymentBreakdown}
              currency={currency}
            />
          )}

          {activeTab === 'customers_products' && (
            <CustomerProductInsightsView
              customers={dataset.customers}
              subscriptions={filteredData.subscriptions}
              invoices={filteredData.invoices}
              products={dataset.products}
              plans={dataset.plans}
            />
          )}

          {activeTab === 'taxes_discounts' && (
            <TaxDiscountReportView
              invoices={filteredData.invoices}
              taxRules={dataset.taxRules}
              discounts={dataset.discounts}
              currency={currency}
            />
          )}
        </div>
      )}
    </div>
  );
}
