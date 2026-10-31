import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import PlanFormModal from '../components/plans/PlanFormModal';
import PlanDetailsModal from '../components/plans/PlanDetailsModal';
import PlanCloseDialog from '../components/plans/PlanCloseDialog';
import { planService } from '../services/planService';
import { productService } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';
import { formatBillingCadence, isPlanExpired } from '../utils/planAndTaxValidation';
import {
  Layers,
  Plus,
  Search,
  Eye,
  Edit,
  PowerOff,
  RotateCcw,
  RefreshCw,
  Package,
} from 'lucide-react';

export default function PlansPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const canManage = isAdmin || isStaff;

  // Query & pagination state
  const [plans, setPlans] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [intervalFilter, setIntervalFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planToEdit, setPlanToEdit] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [planToClose, setPlanToClose] = useState(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load products map once to show product names in table
  useEffect(() => {
    let isMounted = true;
    async function fetchProductsLookup() {
      try {
        const res = await productService.listProducts({ page: 1, pageSize: 100 });
        if (isMounted && res?.items) {
          const map = {};
          res.items.forEach((p) => {
            map[p.id] = p;
          });
          setProductsMap(map);
        }
      } catch {
        // Fallback gracefully
      }
    }
    fetchProductsLookup();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    planService
      .listPlans({
        page,
        pageSize,
        billingInterval: intervalFilter,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        search: debouncedSearch,
      })
      .then((res) => {
        if (isMounted) {
          setPlans(res.items || []);
          setTotalCount(res.total || 0);
          setTotalPages(res.pages || 1);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err?.response?.data?.detail ||
              err?.message ||
              'Failed to load subscription plans. Please verify backend connection and try again.'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, intervalFilter, statusFilter, debouncedSearch, refreshTrigger]);

  // Action Handlers
  const handleCreate = () => {
    setPlanToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (plan) => {
    setPlanToEdit(plan);
    setIsFormOpen(true);
  };

  const handleView = (plan) => {
    setSelectedPlan(plan);
    setIsDetailsOpen(true);
  };

  const handlePromptClose = (plan) => {
    setPlanToClose(plan);
    setIsCloseDialogOpen(true);
  };

  const handleReactivate = async (plan) => {
    try {
      await planService.reactivatePlan(plan.id);
      fetchPlans();
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to reactivate plan. Please retry.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription Plans"
        description="Configure recurring pricing cadences, minimum seat quantities, trial terms, and plan availability."
        breadcrumbs={[
          { label: 'Catalog', href: '/plans' },
          { label: 'Subscription Plans', active: true },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPlans}
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            {canManage && (
              <Button variant="primary" size="sm" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create Plan
              </Button>
            )}
          </div>
        }
      />

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name, code, or description..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Interval:</span>
            <select
              value={intervalFilter}
              onChange={(e) => {
                setIntervalFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Intervals</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Closed / Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <LoadingIndicator text="Loading subscription plans..." />
        </div>
      ) : error ? (
        <ErrorState title="Error Loading Plans" message={error} onRetry={fetchPlans} />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Subscription Plans Found"
          description={
            debouncedSearch || intervalFilter !== 'all' || statusFilter !== 'all'
              ? 'No subscription plans matched the applied search or filter criteria.'
              : 'Create your first subscription plan to start offering recurring products.'
          }
          action={
            canManage && (
              <Button variant="primary" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create First Plan
              </Button>
            )
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Plan Name & Code</th>
                  <th className="py-3 px-4">Associated Product</th>
                  <th className="py-3 px-4">Recurring Price</th>
                  <th className="py-3 px-4">Billing Cadence</th>
                  <th className="py-3 px-4">Min Qty & Trial</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => {
                  const associatedProd = plan.product_id ? productsMap[plan.product_id] : null;
                  const isExpired = isPlanExpired(plan.available_until);

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3 px-4">
                        <div>
                          <span
                            onClick={() => handleView(plan)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer block"
                          >
                            {plan.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                            {plan.code}
                          </span>
                        </div>
                      </td>

                      {/* Associated Product */}
                      <td className="py-3 px-4">
                        {associatedProd ? (
                          <div className="flex items-center space-x-1.5">
                            <Package className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-medium text-slate-800 text-xs truncate max-w-[150px]">
                              {associatedProd.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">None</span>
                        )}
                      </td>

                      {/* Recurring Price */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(plan.price, plan.currency || 'USD')}
                        </span>
                        <span className="text-[11px] text-slate-400 block uppercase">
                          {plan.currency || 'USD'}
                        </span>
                      </td>

                      {/* Billing Cadence */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {formatBillingCadence(plan.billing_interval, plan.interval_count)}
                        </span>
                      </td>

                      {/* Min Qty & Trial */}
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>Min: {plan.minimum_quantity || 1} units</div>
                        {plan.trial_period_days > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            {plan.trial_period_days}d trial
                          </span>
                        ) : (
                          <span className="text-slate-400">No trial</span>
                        )}
                      </td>

                      {/* Availability */}
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {plan.available_until ? (
                          <div>
                            Until {formatDate(plan.available_until)}
                            {isExpired && (
                              <span className="text-red-500 font-semibold block text-[11px]">
                                Expired
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Open-ended</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {plan.is_active && !isExpired ? (
                          <Badge variant="success">Active</Badge>
                        ) : isExpired ? (
                          <Badge variant="danger">Expired</Badge>
                        ) : (
                          <Badge variant="default">Closed</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleView(plan)}
                            title="View Plan Details"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => handleEdit(plan)}
                                title="Edit Plan"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {plan.is_active ? (
                                <button
                                  onClick={() => handlePromptClose(plan)}
                                  title="Close Plan"
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <PowerOff className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(plan)}
                                  title="Reactivate Plan"
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SERVER-SIDE PAGINATION */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {plans.length} of {totalCount} subscription plans
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="font-semibold px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <PlanFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        planToEdit={planToEdit}
        onSuccess={fetchPlans}
      />

      <PlanDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        plan={selectedPlan}
        onEdit={handleEdit}
        onClosePlan={handlePromptClose}
        onReactivatePlan={handleReactivate}
        canManage={canManage}
      />

      <PlanCloseDialog
        isOpen={isCloseDialogOpen}
        onClose={() => setIsCloseDialogOpen(false)}
        plan={planToClose}
        onSuccess={fetchPlans}
      />
    </div>
  );
}
