import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import SubscriptionFormModal from '../components/subscriptions/SubscriptionFormModal';
import SubscriptionDetailsModal from '../components/subscriptions/SubscriptionDetailsModal';
import SubscriptionActionDialog from '../components/subscriptions/SubscriptionActionDialog';
import { subscriptionService } from '../services/subscriptionService';
import { userService } from '../services/userService';
import { planService } from '../services/planService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  getSubscriptionStatusBadge,
  canPauseSubscription,
  canResumeSubscription,
  canCancelSubscription,
  canCloseSubscription,
  SUBSCRIPTION_STATUSES,
} from '../utils/subscriptionValidation';
import { formatBillingCadence } from '../utils/planAndTaxValidation';
import {
  Repeat,
  Plus,
  Search,
  Eye,
  Pause,
  Play,
  XCircle,
  Power,
  RotateCcw,
  CreditCard,
  TrendingUp,
} from 'lucide-react';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const role = user?.role || 'customer';
  const isCustomer = role === 'customer';
  const isAdminOrStaff = role === 'admin' || role === 'staff';

  // Read URL query params for deep-linking (e.g. from Quotations converted subscription)
  const initialSubscriptionId = searchParams.get('id') || '';
  const initialCustomerId = searchParams.get('customer_id') || '';

  // Query & pagination state
  const [subscriptions, setSubscriptions] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [plansMap, setPlansMap] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [intervalFilter, setIntervalFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState(() => initialCustomerId);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [actionDialog, setActionDialog] = useState({
    isOpen: false,
    action: null,
    subscription: null,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load plans and customers lookups
  useEffect(() => {
    let isMounted = true;
    const lookupPromises = [planService.listPlans({ pageSize: 100 })];

    if (isAdminOrStaff) {
      lookupPromises.push(userService.listUsers({ role: 'customer', pageSize: 100 }));
    }

    Promise.allSettled(lookupPromises).then(([planRes, userRes]) => {
      if (!isMounted) return;

      if (planRes.status === 'fulfilled' && planRes.value?.items) {
        const pMap = {};
        planRes.value.items.forEach((p) => {
          pMap[p.id] = p;
        });
        setPlansMap(pMap);
      }

      if (userRes && userRes.status === 'fulfilled' && userRes.value?.items) {
        const uMap = {};
        userRes.value.items.forEach((u) => {
          uMap[u.id] = u;
        });
        setCustomersMap(uMap);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAdminOrStaff]);

  const fetchSubscriptions = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((c) => c + 1);
  }, []);

  // Fetch subscriptions from backend
  useEffect(() => {
    let isMounted = true;

    subscriptionService
      .listSubscriptions({
        page,
        pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        customerId: customerFilter || undefined,
      })
      .then((res) => {
        if (!isMounted) return;

        let items = res.items || [];

        // Client-side filtering for search & interval
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase().trim();
          items = items.filter((s) => {
            const codeMatch = s.subscription_code?.toLowerCase().includes(q);
            const notesMatch = s.notes?.toLowerCase().includes(q);
            const customerObj = customersMap[s.customer_id];
            const custMatch = customerObj && (
              customerObj.full_name?.toLowerCase().includes(q) ||
              customerObj.email?.toLowerCase().includes(q)
            );
            return codeMatch || notesMatch || custMatch;
          });
        }

        if (intervalFilter !== 'all') {
          items = items.filter((s) => s.billing_interval?.toLowerCase() === intervalFilter.toLowerCase());
        }

        setSubscriptions(items);
        setTotalCount(res.total || 0);
        setTotalPages(res.pages || 1);
        setLoading(false);
        setError(null);

        // Auto-open subscription if deep-linked via URL search param
        if (initialSubscriptionId) {
          const target = items.find((s) => s.id === initialSubscriptionId);
          if (target) {
            setSelectedSub(target);
            setIsDetailsOpen(true);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            'Failed to retrieve subscriptions from backend. Please retry.'
        );
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    page,
    pageSize,
    statusFilter,
    intervalFilter,
    customerFilter,
    debouncedSearch,
    refreshTrigger,
    customersMap,
    initialSubscriptionId,
  ]);

  const handleOpenAction = (action, sub) => {
    setActionDialog({
      isOpen: true,
      action,
      subscription: sub,
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setIntervalFilter('all');
    setCustomerFilter('');
    setPage(1);
  };

  const hasActiveFilters = search || statusFilter !== 'all' || intervalFilter !== 'all' || customerFilter;

  // Metric aggregates
  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const pausedCount = subscriptions.filter((s) => s.status === 'paused' || s.status === 'trialing').length;
  const totalValue = subscriptions.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Subscriptions"
        subtitle="Manage recurring customer contracts, billing cadences, and subscription lifecycles."
        badge={
          <Badge variant="indigo" size="sm">
            Phase 8 — Active
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Subscription</span>
          </Button>
        }
      />

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Subscriptions</span>
            <Repeat className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <span className="text-[11px] text-slate-400">Total contracts on record</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Active Contracts</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</div>
          <span className="text-[11px] text-slate-400">Currently generating billing</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Paused / Trial</span>
            <Pause className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{pausedCount}</div>
          <span className="text-[11px] text-slate-400">Suspended or evaluating</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Contract Value</span>
            <CreditCard className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-purple-700 mt-2 truncate">
            {formatCurrency(totalValue)}
          </div>
          <span className="text-[11px] text-slate-400">Loaded period subtotal sum</span>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search code or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              <option value={SUBSCRIPTION_STATUSES.ACTIVE}>Active</option>
              <option value={SUBSCRIPTION_STATUSES.PAUSED}>Paused</option>
              <option value={SUBSCRIPTION_STATUSES.TRIALING}>Trialing</option>
              <option value={SUBSCRIPTION_STATUSES.CANCELLED}>Cancelled</option>
              <option value={SUBSCRIPTION_STATUSES.CLOSED}>Closed</option>
              <option value={SUBSCRIPTION_STATUSES.EXPIRED}>Expired</option>
              <option value={SUBSCRIPTION_STATUSES.CONFIRMED}>Confirmed</option>
              <option value={SUBSCRIPTION_STATUSES.DRAFT}>Draft</option>
            </select>
          </div>

          {/* Interval Filter */}
          <div>
            <select
              value={intervalFilter}
              onChange={(e) => {
                setIntervalFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Cadences</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          {/* Customer Filter (Admin/Staff only) */}
          {isAdminOrStaff && (
            <div>
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="">All Customers</option>
                {Object.values(customersMap).map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.full_name || cust.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Filters applied</span>
            <button
              onClick={handleResetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* DATA VIEW */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12">
          <LoadingIndicator text="Loading subscription contracts..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Subscriptions"
          message={error}
          action={
            <Button variant="secondary" onClick={fetchSubscriptions}>
              Retry Connection
            </Button>
          }
        />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title={hasActiveFilters ? 'No Subscriptions Match Filters' : 'No Subscriptions Found'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search criteria, billing cadence, or status filter.'
              : 'Provision recurring contracts using catalog plans or convert accepted quotations.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                Provision First Subscription
              </Button>
            )
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Subscription Code</th>
                  <th className="py-3 px-4">Subscriber</th>
                  <th className="py-3 px-4">Plan & Cadence</th>
                  <th className="py-3 px-4">Period & Next Billing</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {subscriptions.map((sub) => {
                  const statusBadge = getSubscriptionStatusBadge(sub.status);
                  const customerObj = customersMap[sub.customer_id];
                  const planObj = plansMap[sub.plan_id];

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* CODE & NOTES */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            setSelectedSub(sub);
                            setIsDetailsOpen(true);
                          }}
                          className="font-mono font-bold text-slate-900 uppercase hover:text-indigo-600 block text-left"
                        >
                          {sub.subscription_code}
                        </button>
                        {sub.notes && (
                          <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                            {sub.notes}
                          </p>
                        )}
                      </td>

                      {/* SUBSCRIBER */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-900">
                          {customerObj?.full_name || (isCustomer ? user?.displayName || user?.email : 'Subscriber Account')}
                        </div>
                        <span className="text-slate-400 block truncate max-w-[180px]">
                          {customerObj?.email || sub.customer_id}
                        </span>
                      </td>

                      {/* PLAN & CADENCE */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-800">
                          {planObj?.name || 'Subscription Plan'}
                        </div>
                        <span className="text-slate-500 uppercase tracking-wider text-[11px]">
                          {formatBillingCadence(sub.billing_interval)} (x{sub.quantity})
                        </span>
                      </td>

                      {/* PERIOD & NEXT BILLING */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400">Renews: </span>
                          <span className="font-semibold text-slate-800">
                            {formatDate(sub.next_billing_date)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Period End: {formatDate(sub.current_period_end)}
                        </span>
                      </td>

                      {/* AMOUNT */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(sub.total_amount)}
                        </span>
                        <span className="block text-[11px] text-slate-400 uppercase">
                          {sub.payment_terms || 'due_on_receipt'}
                        </span>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            statusBadge.color === 'emerald'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : statusBadge.color === 'amber'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : statusBadge.color === 'red'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : statusBadge.color === 'blue'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {statusBadge.dot && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                statusBadge.color === 'emerald'
                                  ? 'bg-emerald-500'
                                  : statusBadge.color === 'amber'
                                  ? 'bg-amber-500'
                                  : statusBadge.color === 'red'
                                  ? 'bg-red-500'
                                  : 'bg-blue-500'
                              }`}
                            />
                          )}
                          <span>{statusBadge.label}</span>
                        </span>
                      </td>

                      {/* ROW ACTIONS */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setSelectedSub(sub);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Inspect contract details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canPauseSubscription(sub) && (
                            <button
                              onClick={() => handleOpenAction('pause', sub)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Pause subscription"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )}

                          {canResumeSubscription(sub) && (
                            <button
                              onClick={() => handleOpenAction('resume', sub)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Resume subscription"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}

                          {canCancelSubscription(sub) && (
                            <button
                              onClick={() => handleOpenAction('cancel', sub)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel subscription"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {canCloseSubscription(sub, role) && (
                            <button
                              onClick={() => handleOpenAction('close', sub)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Close subscription contract"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing page <strong className="font-semibold text-slate-900">{page}</strong> of{' '}
                <strong className="font-semibold text-slate-900">{totalPages}</strong> ({totalCount} total contracts)
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {isFormOpen && (
        <SubscriptionFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchSubscriptions}
        />
      )}

      {isDetailsOpen && (
        <SubscriptionDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          subscription={selectedSub}
          customerName={customersMap[selectedSub?.customer_id]?.full_name}
          planName={plansMap[selectedSub?.plan_id]?.name}
          onAction={(act, sub) => handleOpenAction(act, sub)}
        />
      )}

      {actionDialog.isOpen && (
        <SubscriptionActionDialog
          isOpen={actionDialog.isOpen}
          onClose={() => setActionDialog({ isOpen: false, action: null, subscription: null })}
          onSuccess={fetchSubscriptions}
          action={actionDialog.action}
          subscription={actionDialog.subscription}
        />
      )}
    </div>
  );
}
