import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Repeat,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Package,
  Layers,
  Receipt,
  UserPlus,
  Info,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DashboardMetricCard from './DashboardMetricCard';
import DashboardChartCard from './DashboardChartCard';
import DashboardSection from './DashboardSection';
import InvoiceSummary from './InvoiceSummary';
import SubscriptionSummary from './SubscriptionSummary';
import RecentPaymentsTable from './RecentPaymentsTable';
import RecentActivityList from './RecentActivityList';
import DateRangeFilter from './DateRangeFilter';
import DashboardLoadingState from './DashboardLoadingState';
import CreateStaffModal from '../users/CreateStaffModal';
import { dashboardService } from '../../services/dashboardService';
import { formatCurrency, formatNumber } from '../../utils/formatters';

export default function AdminDashboardView() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    let isMounted = true;
    dashboardService
      .getAdminMetrics()
      .then((data) => {
        if (isMounted) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[Brightloop AdminDashboard] Metrics error:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <DashboardLoadingState />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Administrative Command Center"
        description="Comprehensive platform metrics across recurring revenue, customer growth, and billing status."
        breadcrumbs={[{ label: 'Brightloop', href: '/' }, { label: 'Admin Dashboard' }]}
        badge={
          <Badge variant="primary" size="sm" className="bg-purple-100 text-purple-800 border-purple-200">
            Admin Authority
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStaffModalOpen(true)}
              className="shadow-2xs text-xs"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Provision Staff
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/users')}
              className="shadow-2xs text-xs"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              User Directory
            </Button>
          </div>
        }
      />

      {/* Backend API Transparency Banner */}
      {metrics?.missingEndpoints && metrics.missingEndpoints.length > 0 && (
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-start gap-3 text-xs text-indigo-950">
          <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-indigo-900">
              Live Backend Synchronization Status:
            </p>
            <p className="text-indigo-800 leading-relaxed">
              Customer totals are synchronized in real-time from PostgreSQL (<code className="bg-indigo-100/80 px-1 py-0.5 rounded text-[11px] font-mono">GET /api/v1/users</code>). Business revenue aggregates (MRR, invoice sums, churn rates) are marked pending until Developer 1 implements Phase 4/7 domain routers.
            </p>
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Customers (Live) */}
        <DashboardMetricCard
          title="Total Customers"
          value={formatNumber(metrics?.customerCount ?? 0)}
          icon={Users}
          badgeLabel="Live PostgreSQL"
          caption="Verified application customer identities"
        />

        {/* Total Staff (Live) */}
        <DashboardMetricCard
          title="Staff Operators"
          value={formatNumber(metrics?.staffCount ?? 0)}
          icon={Users}
          badgeLabel="Live PostgreSQL"
          caption="Active operational staff identities"
        />

        {/* Monthly Recurring Revenue (Awaiting API) */}
        <DashboardMetricCard
          title="Monthly Recurring Revenue (MRR)"
          value={metrics?.mrr !== null ? formatCurrency(metrics?.mrr) : null}
          icon={DollarSign}
          isPendingApi={metrics?.mrr === null}
          caption="Awaiting Phase 7 MRR aggregator"
        />

        {/* Active Subscriptions */}
        <DashboardMetricCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions}
          icon={Repeat}
          isPendingApi={metrics?.activeSubscriptions === null}
          caption="Awaiting Phase 4 subscription engine"
        />

        {/* Collected Revenue */}
        <DashboardMetricCard
          title="Total Collected Revenue"
          value={metrics?.collectedRevenue !== null ? formatCurrency(metrics?.collectedRevenue) : null}
          icon={TrendingUp}
          isPendingApi={metrics?.collectedRevenue === null}
          caption="Awaiting Phase 6/10 reconciliation"
        />

        {/* Overdue Invoices */}
        <DashboardMetricCard
          title="Overdue Invoices"
          value={metrics?.overdueInvoices}
          icon={AlertCircle}
          changeType="negative"
          isPendingApi={metrics?.overdueInvoices === null}
          caption="Awaiting Phase 4 invoice generator"
        />
      </div>

      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardChartCard
          title="Monthly Revenue Trend (MRR)"
          description="Historical revenue performance formatted in Indian Rupees (₹)"
          action={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
          isPendingApi={!metrics?.monthlyRevenueTrend}
          pendingReason="Time-series revenue aggregation API (GET /api/v1/analytics/mrr) scheduled for Phase 7."
        />

        <DashboardChartCard
          title="Customer Growth Velocity"
          description="New customer sign-ups and acquisition rates"
          action={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
          isPendingApi={true}
          pendingReason="Cohort analytics endpoint (GET /api/v1/analytics/cohorts) scheduled for Phase 7."
        />
      </div>

      {/* Operational Summaries Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionSummary isPendingApi={true} />
        <InvoiceSummary isPendingApi={true} />
      </div>

      {/* Quick Action Navigation Panels */}
      <DashboardSection
        title="Administrative Workflows"
        description="Direct navigation to catalog configuration and billing management."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Button
            variant="outline"
            className="flex-col h-auto py-3 px-2 text-center text-xs justify-center hover:border-indigo-300"
            onClick={() => setIsStaffModalOpen(true)}
          >
            <UserPlus className="w-5 h-5 text-indigo-600 mb-1.5" />
            <span>Create Staff</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-3 px-2 text-center text-xs justify-center hover:border-indigo-300"
            onClick={() => navigate('/users')}
          >
            <Users className="w-5 h-5 text-indigo-600 mb-1.5" />
            <span>Directory</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-3 px-2 text-center text-xs justify-center hover:border-indigo-300"
            onClick={() => navigate('/products')}
          >
            <Package className="w-5 h-5 text-indigo-600 mb-1.5" />
            <span>Products</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-3 px-2 text-center text-xs justify-center hover:border-indigo-300"
            onClick={() => navigate('/plans')}
          >
            <Layers className="w-5 h-5 text-indigo-600 mb-1.5" />
            <span>Plans</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-3 px-2 text-center text-xs justify-center hover:border-indigo-300"
            onClick={() => navigate('/subscriptions')}
          >
            <Repeat className="w-5 h-5 text-indigo-600 mb-1.5" />
            <span>Subscriptions</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-3 px-2 text-center text-xs justify-center hover:border-indigo-300"
            onClick={() => navigate('/invoices')}
          >
            <Receipt className="w-5 h-5 text-indigo-600 mb-1.5" />
            <span>Invoices</span>
          </Button>
        </div>
      </DashboardSection>

      {/* Recent Payments & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPaymentsTable />
        <RecentActivityList />
      </div>

      {/* Staff Provisioning Modal */}
      <CreateStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />
    </div>
  );
}
