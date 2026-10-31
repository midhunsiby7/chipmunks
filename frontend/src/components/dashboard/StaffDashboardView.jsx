import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Repeat,
  FileSpreadsheet,
  Receipt,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import DashboardMetricCard from './DashboardMetricCard';
import DashboardSection from './DashboardSection';
import InvoiceSummary from './InvoiceSummary';
import SubscriptionSummary from './SubscriptionSummary';
import RecentPaymentsTable from './RecentPaymentsTable';
import RecentActivityList from './RecentActivityList';
import DashboardLoadingState from './DashboardLoadingState';
import { dashboardService } from '../../services/dashboardService';
import { formatNumber } from '../../utils/formatters';

export default function StaffDashboardView() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    dashboardService
      .getStaffMetrics()
      .then((data) => {
        if (isMounted) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[Brightloop StaffDashboard] Metrics error:', err);
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
        title="Staff Operations Hub"
        description="Daily operational workspace for managing customer accounts, active subscriptions, and quotation workflows."
        breadcrumbs={[{ label: 'Brightloop', href: '/' }, { label: 'Staff Dashboard' }]}
        badge={
          <Badge variant="info" size="sm" className="bg-blue-100 text-blue-800 border-blue-200">
            Staff Operator
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/customers')}
              className="shadow-2xs text-xs"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              Customer Directory
            </Button>
          </div>
        }
      />

      {/* Security Scope Notice */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3 text-xs text-blue-950">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-900">Operational Scope Active:</p>
          <p className="text-blue-800 leading-relaxed">
            Staff operators have access to customer management, quotation handling, and subscription tracking. Administrative provisioning and organization settings are restricted.
          </p>
        </div>
      </div>

      {/* Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Accessible Customers */}
        <DashboardMetricCard
          title="Assigned Customers"
          value={formatNumber(metrics?.accessibleCustomers ?? 0)}
          icon={Users}
          badgeLabel="Verified Records"
          caption="Active client profiles in PostgreSQL"
        />

        {/* Active Subscriptions */}
        <DashboardMetricCard
          title="Active Subscriptions"
          value={metrics?.activeSubscriptions}
          icon={Repeat}
          isPendingApi={metrics?.activeSubscriptions === null}
          caption="Awaiting Phase 4 subscription engine"
        />

        {/* Pending Quotations */}
        <DashboardMetricCard
          title="Pending Quotations"
          value={metrics?.pendingQuotations}
          icon={FileSpreadsheet}
          isPendingApi={metrics?.pendingQuotations === null}
          caption="Awaiting Phase 4 quotation router"
        />

        {/* Outstanding Invoices */}
        <DashboardMetricCard
          title="Outstanding Invoices"
          value={metrics?.outstandingInvoices}
          icon={Receipt}
          isPendingApi={metrics?.outstandingInvoices === null}
          caption="Awaiting Phase 4 invoice generator"
        />
      </div>

      {/* Operational Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionSummary isPendingApi={true} />
        <InvoiceSummary isPendingApi={true} />
      </div>

      {/* Quick Action Navigation Panels */}
      <DashboardSection
        title="Quick Operational Actions"
        description="Frequently executed customer and subscription management tasks."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="flex-col h-auto py-3.5 px-3 text-center text-xs justify-center hover:border-blue-300"
            onClick={() => navigate('/customers')}
          >
            <Users className="w-5 h-5 text-blue-600 mb-1.5" />
            <span className="font-semibold text-slate-800">Browse Customers</span>
            <span className="text-[10px] text-slate-400 mt-0.5">View client directory</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-3.5 px-3 text-center text-xs justify-center hover:border-blue-300"
            onClick={() => navigate('/quotations')}
          >
            <PlusCircle className="w-5 h-5 text-blue-600 mb-1.5" />
            <span className="font-semibold text-slate-800">Draft Quotation</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Prepare pricing quote</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-3.5 px-3 text-center text-xs justify-center hover:border-blue-300"
            onClick={() => navigate('/subscriptions')}
          >
            <Repeat className="w-5 h-5 text-blue-600 mb-1.5" />
            <span className="font-semibold text-slate-800">Manage Plans</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Active subscriptions</span>
          </Button>

          <Button
            variant="outline"
            className="flex-col h-auto py-3.5 px-3 text-center text-xs justify-center hover:border-blue-300"
            onClick={() => navigate('/invoices')}
          >
            <Receipt className="w-5 h-5 text-blue-600 mb-1.5" />
            <span className="font-semibold text-slate-800">Review Invoices</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Pending payments</span>
          </Button>
        </div>
      </DashboardSection>

      {/* Operational Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPaymentsTable />
        <RecentActivityList title="Customer Activity Feed" />
      </div>
    </div>
  );
}
