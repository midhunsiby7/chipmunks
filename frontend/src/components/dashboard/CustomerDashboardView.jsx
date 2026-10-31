import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import DashboardMetricCard from './DashboardMetricCard';
import DashboardSection from './DashboardSection';
import DashboardLoadingState from './DashboardLoadingState';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CustomerDashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    dashboardService
      .getCustomerMetrics()
      .then((data) => {
        if (isMounted) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[Brightloop CustomerDashboard] Error:', err);
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

  const customerName = user?.full_name || 'Valued Customer';
  const companyName = user?.company_name || 'Personal Account';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Customer Portal
              </span>
              {user?.is_active && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Account
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {customerName}
            </h1>
            <p className="text-xs text-indigo-200">
              {companyName} • {user?.email}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/invoices')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            >
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              My Invoices
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/subscriptions')}
              className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs"
            >
              <Repeat className="w-3.5 h-3.5 mr-1.5" />
              My Subscriptions
            </Button>
          </div>
        </div>
      </div>

      {/* Customer's Personal Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Active Subscriptions */}
        <DashboardMetricCard
          title="My Active Subscriptions"
          value={metrics?.activeSubscriptions}
          icon={Repeat}
          isPendingApi={metrics?.activeSubscriptions === null}
          caption="Awaiting Phase 4 subscription engine"
        />

        {/* Outstanding Invoices */}
        <DashboardMetricCard
          title="Outstanding Balance"
          value={metrics?.outstandingAmount !== null ? formatCurrency(metrics?.outstandingAmount) : null}
          icon={Receipt}
          isPendingApi={metrics?.outstandingAmount === null}
          caption="Awaiting Phase 4 invoicing engine"
        />

        {/* Upcoming Renewal */}
        <DashboardMetricCard
          title="Next Renewal Date"
          value={metrics?.upcomingRenewal ? formatDate(metrics.upcomingRenewal) : null}
          icon={Calendar}
          isPendingApi={!metrics?.upcomingRenewal}
          caption="Next recurring billing cycle"
        />
      </div>

      {/* Quick Action Navigation Grid */}
      <DashboardSection
        title="Self-Service Portal"
        description="Manage your ongoing SaaS subscriptions, inspect billing statements, and review payments."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="p-5 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => navigate('/subscriptions')}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
              <Repeat className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Active Subscriptions
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Inspect subscribed tiers, renewal dates, and cadence cycles.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              View Plans <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>

          <Card
            className="p-5 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => navigate('/invoices')}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Billing Invoices
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Download tax invoices, inspect due amounts, and payment status.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              View Invoices <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>

          <Card
            className="p-5 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => navigate('/payments')}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Payment History
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Track transaction IDs, card/UPI receipts, and balance credits.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              Payment History <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>

          <Card
            className="p-5 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
            onClick={() => navigate('/subscriptions')}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Browse Plans
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Explore available software tiers, add-ons, and annual discounts.
            </p>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              Explore Catalog <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>
        </div>
      </DashboardSection>

      {/* Customer Subscriptions & Invoices Placeholder Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 text-center space-y-2">
          <Repeat className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">My Subscribed Services</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Live subscription state machines and renewal toggles will appear here upon Phase 4 engine integration.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/subscriptions')}
            className="mt-2 text-xs"
          >
            Browse Available Subscriptions
          </Button>
        </Card>

        <Card className="p-6 text-center space-y-2">
          <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">Recent Invoices & Receipts</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your itemized monthly and annual statements will be listed here automatically once generated.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/invoices')}
            className="mt-2 text-xs"
          >
            View Invoices
          </Button>
        </Card>
      </div>
    </div>
  );
}
