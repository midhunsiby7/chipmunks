import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  AlertTriangle,
  Zap,
  User,
  Clock,
  Eye,
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import DashboardMetricCard from './DashboardMetricCard';
import DashboardSection from './DashboardSection';
import DashboardLoadingState from './DashboardLoadingState';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getInvoiceStatusBadge } from '../../utils/invoiceValidation';
import { getPaymentStatusBadge, getPaymentMethodBadge } from '../../utils/paymentValidation';

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
        console.error('[Brightloop CustomerDashboard] Error loading metrics:', err);
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
  const hasOutstandingBalance = Number(metrics?.outstandingAmount) > 0;
  const hasPendingQuotations = Number(metrics?.pendingQuotations) > 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. WELCOME BANNER HEADER */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Customer Portal
              </span>
              {user?.is_active && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-medium">
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

          <div className="flex flex-wrap items-center gap-2.5">
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

      {/* 2. ACTIONABLE ALERT BANNERS */}
      {(hasOutstandingBalance || hasPendingQuotations) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Outstanding Invoice Banner */}
          {hasOutstandingBalance && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-900">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Outstanding Balance Due</h4>
                  <p className="text-xs text-red-700 mt-0.5">
                    You have an outstanding balance of <strong>{formatCurrency(metrics.outstandingAmount)}</strong> across your billing statements.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/invoices')}
                className="bg-red-600 hover:bg-red-700 text-white text-xs shrink-0 flex items-center space-x-1"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 mr-1" />
                Pay Online
              </Button>
            </div>
          )}

          {/* Pending Quotations Banner */}
          {hasPendingQuotations && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start justify-between gap-3 text-indigo-900">
              <div className="flex items-start space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Quotation Pending Acceptance</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    You have <strong>{metrics.pendingQuotations}</strong> formal pricing proposal(s) waiting for your review and approval.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/quotations')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0 flex items-center space-x-1"
              >
                <span>Review Quotes</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 3. LIVE CUSTOMER METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Subscriptions */}
        <div
          onClick={() => navigate('/subscriptions')}
          className="cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <DashboardMetricCard
            title="My Active Subscriptions"
            value={metrics?.activeSubscriptions ?? 0}
            icon={Repeat}
            caption="Live recurring services"
          />
        </div>

        {/* Outstanding Balance */}
        <div
          onClick={() => navigate('/invoices')}
          className="cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <DashboardMetricCard
            title="Outstanding Balance"
            value={formatCurrency(metrics?.outstandingAmount ?? 0)}
            icon={Receipt}
            caption={metrics?.unpaidInvoicesCount ? `${metrics.unpaidInvoicesCount} statement(s) pending` : 'All invoices settled'}
          />
        </div>

        {/* Pending Quotations */}
        <div
          onClick={() => navigate('/quotations')}
          className="cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <DashboardMetricCard
            title="Pending Quotations"
            value={metrics?.pendingQuotations ?? 0}
            icon={FileSpreadsheet}
            caption="Formal proposals awaiting review"
          />
        </div>

        {/* Upcoming Renewal */}
        <div
          onClick={() => navigate('/subscriptions')}
          className="cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <DashboardMetricCard
            title="Next Billing Cycle"
            value={metrics?.upcomingRenewal ? formatDate(metrics.upcomingRenewal) : '—'}
            icon={Calendar}
            caption={metrics?.upcomingRenewal ? 'Scheduled recurring invoice' : 'No active renewal due'}
          />
        </div>
      </div>

      {/* 4. SELF-SERVICE PORTAL ACTION CARDS */}
      <DashboardSection
        title="Customer Self-Service Hub"
        description="Inspect ongoing service contracts, formal pricing proposals, invoices, and verified receipts."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card
            className="p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            onClick={() => navigate('/subscriptions')}
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2.5 group-hover:scale-105 transition-transform">
                <Repeat className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                My Subscriptions
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Active tiers, seats, cadence, and pause/cancel options.
              </p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              View <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>

          <Card
            className="p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            onClick={() => navigate('/quotations')}
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2.5 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                My Quotations
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Accept or reject formal commercial proposals.
              </p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              Review <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>

          <Card
            className="p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            onClick={() => navigate('/invoices')}
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2.5 group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                My Invoices
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Download PDF statements and pay online via Razorpay.
              </p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              Pay & View <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>

          <Card
            className="p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            onClick={() => navigate('/payments')}
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2.5 group-hover:scale-105 transition-transform">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                My Payments
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Audit transaction IDs, card/UPI records, and receipts.
              </p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              Receipts <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>

          <Card
            className="p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
            onClick={() => navigate('/profile')}
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-2.5 group-hover:scale-105 transition-transform">
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                My Profile
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Account information, credentials, and password reset.
              </p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-3 group-hover:translate-x-0.5 transition-transform">
              Account <ArrowRight className="w-3 h-3 ml-1" />
            </span>
          </Card>
        </div>
      </DashboardSection>

      {/* 5. RECENT RECORDS: INVOICES & PAYMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices Card */}
        <Card className="p-5 space-y-3 border border-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-slate-800">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Recent Invoices & Statements
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/invoices')}
              className="text-[11px] px-2 py-0.5"
            >
              All Invoices
            </Button>
          </div>

          {metrics?.recentInvoices && metrics.recentInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50">
                  <tr>
                    <th className="py-2 px-2.5">Invoice #</th>
                    <th className="py-2 px-2.5">Due Date</th>
                    <th className="py-2 px-2.5 text-right">Amount</th>
                    <th className="py-2 px-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentInvoices.map((inv) => {
                    const badge = getInvoiceStatusBadge(inv.status);
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        onClick={() => navigate(`/invoices?id=${inv.id}`)}
                      >
                        <td className="py-2.5 px-2.5 font-mono font-bold text-slate-800">
                          {inv.invoice_number}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-500">
                          {formatDate(inv.due_date)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(inv.total_amount, inv.currency)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              badge.variant === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : badge.variant === 'warning'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : badge.variant === 'danger'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              No invoice statements issued yet.
            </div>
          )}
        </Card>

        {/* Recent Payments Card */}
        <Card className="p-5 space-y-3 border border-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-slate-800">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Recent Payment Receipts
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/payments')}
              className="text-[11px] px-2 py-0.5"
            >
              All Payments
            </Button>
          </div>

          {metrics?.recentPayments && metrics.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50">
                  <tr>
                    <th className="py-2 px-2.5">Reference</th>
                    <th className="py-2 px-2.5">Date</th>
                    <th className="py-2 px-2.5">Method</th>
                    <th className="py-2 px-2.5 text-right">Amount</th>
                    <th className="py-2 px-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentPayments.map((p) => {
                    const pStatus = getPaymentStatusBadge(p.status);
                    const pMethod = getPaymentMethodBadge(p.payment_method);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        onClick={() => navigate(`/payments?id=${p.id}`)}
                      >
                        <td className="py-2.5 px-2.5 font-mono font-bold text-slate-800">
                          {p.payment_reference}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-500">
                          {formatDate(p.paid_at || p.created_at)}
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-600">
                          {pMethod.label}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(p.amount, p.currency)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              pStatus.variant === 'success'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : pStatus.variant === 'warning'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {pStatus.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              No payment transactions recorded yet.
            </div>
          )}
        </Card>
      </div>

      {/* 6. SUBSCRIBED SERVICES DIRECTORY */}
      {metrics?.activeSubsList && metrics.activeSubsList.length > 0 && (
        <Card className="p-5 space-y-3 border border-slate-200">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-slate-800">
              <Repeat className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                My Active Subscriptions
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/subscriptions')}
              className="text-[11px] px-2 py-0.5"
            >
              Manage All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.activeSubsList.map((sub) => (
              <div
                key={sub.id}
                onClick={() => navigate(`/subscriptions?id=${sub.id}`)}
                className="p-3.5 bg-slate-50/70 border border-slate-200 hover:border-indigo-300 rounded-xl cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {sub.subscription_code}
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {sub.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex justify-between">
                  <span>Billing Frequency:</span>
                  <span className="font-semibold uppercase text-slate-800">{sub.cadence || 'Monthly'}</span>
                </div>
                <div className="text-xs text-slate-600 flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(sub.total_amount)}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Next: {sub.next_billing_date ? formatDate(sub.next_billing_date) : formatDate(sub.current_period_end)}
                  </span>
                  <span className="text-indigo-600 font-semibold group-hover:underline flex items-center">
                    Inspect <Eye className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
