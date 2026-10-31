import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import InvoiceFormModal from '../components/invoices/InvoiceFormModal';
import InvoiceDetailsModal from '../components/invoices/InvoiceDetailsModal';
import InvoiceCancelDialog from '../components/invoices/InvoiceCancelDialog';
import RecurringBillingModal from '../components/invoices/RecurringBillingModal';
import { invoiceService } from '../services/invoiceService';
import { userService } from '../services/userService';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  getInvoiceStatusBadge,
  isInvoiceOverdue,
  canCancelInvoice,
  INVOICE_STATUSES,
} from '../utils/invoiceValidation';
import {
  Receipt,
  Plus,
  Search,
  Eye,
  Printer,
  XCircle,
  RotateCcw,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export default function InvoicesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const role = user?.role || 'customer';
  const isCustomer = role === 'customer';
  const isAdminOrStaff = role === 'admin' || role === 'staff';

  // Read URL query params for deep-linking
  const initialInvoiceId = searchParams.get('id') || '';
  const initialSubscriptionId = searchParams.get('subscription_id') || '';
  const initialCustomerId = searchParams.get('customer_id') || '';

  // Query & pagination state
  const [invoices, setInvoices] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [subscriptionsMap, setSubscriptionsMap] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [customerFilter, setCustomerFilter] = useState(() => initialCustomerId);
  const [subscriptionFilter, setSubscriptionFilter] = useState(() => initialSubscriptionId);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load customer and subscription lookups for friendly name resolution
  useEffect(() => {
    let isMounted = true;
    const lookupPromises = [subscriptionService.listSubscriptions({ pageSize: 100 })];

    if (isAdminOrStaff) {
      lookupPromises.push(userService.listUsers({ role: 'customer', pageSize: 100 }));
    }

    Promise.allSettled(lookupPromises).then(([subRes, userRes]) => {
      if (!isMounted) return;

      if (subRes.status === 'fulfilled' && subRes.value?.items) {
        const sMap = {};
        subRes.value.items.forEach((s) => {
          sMap[s.id] = s;
        });
        setSubscriptionsMap(sMap);
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

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((c) => c + 1);
  }, []);

  // Fetch invoices from backend
  useEffect(() => {
    let isMounted = true;

    invoiceService
      .listInvoices({
        page,
        pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
        customerId: customerFilter || undefined,
        subscriptionId: subscriptionFilter || undefined,
      })
      .then((res) => {
        if (!isMounted) return;

        let items = res.items || [];

        // Client-side search filtering
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase().trim();
          items = items.filter((inv) => {
            const numMatch = inv.invoice_number?.toLowerCase().includes(q);
            const notesMatch = inv.notes?.toLowerCase().includes(q);
            const customerObj = customersMap[inv.customer_id];
            const custMatch = customerObj && (
              customerObj.full_name?.toLowerCase().includes(q) ||
              customerObj.email?.toLowerCase().includes(q)
            );
            return numMatch || notesMatch || custMatch;
          });
        }

        // Overdue toggle
        if (overdueOnly) {
          items = items.filter((inv) => isInvoiceOverdue(inv.due_date, inv.amount_due));
        }

        setInvoices(items);
        setTotalCount(res.total || 0);
        setTotalPages(res.pages || 1);
        setLoading(false);
        setError(null);

        // Deep-linking URL param support
        if (initialInvoiceId) {
          const target = items.find((i) => i.id === initialInvoiceId);
          if (target) {
            setSelectedInvoice(target);
            setIsDetailsOpen(true);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            'Failed to retrieve invoices from backend. Please retry.'
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
    overdueOnly,
    customerFilter,
    subscriptionFilter,
    debouncedSearch,
    refreshTrigger,
    customersMap,
    initialInvoiceId,
  ]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setOverdueOnly(false);
    setCustomerFilter('');
    setSubscriptionFilter('');
    setPage(1);
  };

  const hasActiveFilters =
    search || statusFilter !== 'all' || overdueOnly || customerFilter || subscriptionFilter;

  // KPI Calculations
  const paidCount = invoices.filter((i) => i.status === INVOICE_STATUSES.PAID).length;
  const overdueCount = invoices.filter((i) => isInvoiceOverdue(i.due_date, i.amount_due)).length;
  const totalDueAmount = invoices.reduce((sum, i) => sum + (Number(i.amount_due) || 0), 0);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Invoices"
        subtitle="Automated recurring invoice generation, status tracking, and balance reconciliation."
        badge={
          <Badge variant="indigo" size="sm">
            Phase 9 — Active
          </Badge>
        }
        actions={
          <div className="flex items-center space-x-2.5">
            {isAdminOrStaff && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="flex items-center space-x-2 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/70 border-indigo-200"
                >
                  <Repeat className="w-4 h-4 text-indigo-600" />
                  <span>Run Recurring Billing</span>
                </Button>

                <Button
                  variant="primary"
                  onClick={() => setIsFormOpen(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Invoice</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Invoices</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <span className="text-[11px] text-slate-400">Total billing records</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Paid Invoices</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{paidCount}</div>
          <span className="text-[11px] text-slate-400">Settled without balance</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Overdue Invoices</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${overdueCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {overdueCount}
          </div>
          <span className="text-[11px] text-slate-400">Past payment deadline</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2 truncate">
            {formatCurrency(totalDueAmount)}
          </div>
          <span className="text-[11px] text-slate-400">Total receivables due</span>
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
              placeholder="Search invoice number or customer..."
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
              <option value={INVOICE_STATUSES.PAID}>Paid</option>
              <option value={INVOICE_STATUSES.CONFIRMED}>Confirmed</option>
              <option value={INVOICE_STATUSES.ISSUED}>Issued</option>
              <option value={INVOICE_STATUSES.PARTIALLY_PAID}>Partially Paid</option>
              <option value={INVOICE_STATUSES.OVERDUE}>Overdue</option>
              <option value={INVOICE_STATUSES.CANCELLED}>Cancelled</option>
              <option value={INVOICE_STATUSES.VOID}>Void</option>
              <option value={INVOICE_STATUSES.DRAFT}>Draft</option>
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

          {/* Overdue Quick Filter Checkbox */}
          <div className="flex items-center pt-2 md:pt-0">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => {
                  setOverdueOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className={overdueOnly ? 'text-red-600' : ''}>Show Overdue Invoices Only</span>
            </label>
          </div>
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
          <LoadingIndicator text="Loading invoice records..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Invoices"
          message={error}
          action={
            <Button variant="secondary" onClick={fetchInvoices}>
              Retry Connection
            </Button>
          }
        />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={hasActiveFilters ? 'No Invoices Match Filters' : 'No Invoices Found'}
          description={
            hasActiveFilters
              ? 'Try clearing your search keyword, status filter, or overdue toggle.'
              : 'Invoices will be automatically generated upon scheduled subscription billing cycles.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            ) : isAdminOrStaff ? (
              <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                Create First Invoice
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice Number</th>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Billing Period</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Amount Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {invoices.map((inv) => {
                  const statusBadge = getInvoiceStatusBadge(inv.status);
                  const isOverdue = isInvoiceOverdue(inv.due_date, inv.amount_due);
                  const customerObj = customersMap[inv.customer_id];
                  const subObj = subscriptionsMap[inv.subscription_id];

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* NUMBER & MEMO */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDetailsOpen(true);
                          }}
                          className="font-mono font-bold text-slate-900 uppercase hover:text-indigo-600 block text-left"
                        >
                          {inv.invoice_number}
                        </button>
                        {inv.notes && (
                          <p className="text-xs text-slate-400 truncate max-w-xs mt-0.5">
                            {inv.notes}
                          </p>
                        )}
                      </td>

                      {/* CUSTOMER */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-900">
                          {customerObj?.full_name || (isCustomer ? user?.displayName || user?.email : 'Subscriber Account')}
                        </div>
                        <span className="text-slate-400 block truncate max-w-[180px]">
                          {customerObj?.email || inv.customer_id}
                        </span>
                      </td>

                      {/* BILLING PERIOD */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {inv.billing_period_start && inv.billing_period_end ? (
                          <>
                            <div className="font-medium text-slate-800">
                              {formatDate(inv.billing_period_start)} – {formatDate(inv.billing_period_end)}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {subObj?.subscription_code || 'Subscription Cycle'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">Manual Invoicing</span>
                        )}
                      </td>

                      {/* DUE DATE */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className={`font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                          {formatDate(inv.due_date)}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Issued: {formatDate(inv.issue_date)}
                        </span>
                      </td>

                      {/* TOTAL AMOUNT */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(inv.total_amount, inv.currency)}
                        </span>
                        {Number(inv.amount_paid) > 0 && (
                          <span className="block text-[11px] text-emerald-600">
                            Paid: {formatCurrency(inv.amount_paid, inv.currency)}
                          </span>
                        )}
                      </td>

                      {/* AMOUNT DUE */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold ${
                            Number(inv.amount_due) > 0
                              ? isOverdue
                                ? 'text-red-600'
                                : 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatCurrency(inv.amount_due, inv.currency)}
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
                              : statusBadge.color === 'indigo'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
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
                                  : statusBadge.color === 'blue'
                                  ? 'bg-blue-500'
                                  : 'bg-indigo-500'
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
                              setSelectedInvoice(inv);
                              setIsDetailsOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Inspect details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => window.open(`/api/v1/invoices/${inv.id}/html`, '_blank')}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Print / PDF document"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {canCancelInvoice(inv, role) && (
                            <button
                              onClick={() => {
                                setInvoiceToCancel(inv);
                                setIsCancelOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel invoice"
                            >
                              <XCircle className="w-4 h-4" />
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
                <strong className="font-semibold text-slate-900">{totalPages}</strong> ({totalCount} total invoices)
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
        <InvoiceFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchInvoices}
        />
      )}

      {isDetailsOpen && (
        <InvoiceDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          invoice={selectedInvoice}
          customerName={customersMap[selectedInvoice?.customer_id]?.full_name}
          subscriptionCode={subscriptionsMap[selectedInvoice?.subscription_id]?.subscription_code}
          onCancelClick={(inv) => {
            setInvoiceToCancel(inv);
            setIsCancelOpen(true);
          }}
          onInvoiceUpdated={fetchInvoices}
        />
      )}

      {isCancelOpen && (
        <InvoiceCancelDialog
          isOpen={isCancelOpen}
          onClose={() => setIsCancelOpen(false)}
          onSuccess={fetchInvoices}
          invoice={invoiceToCancel}
        />
      )}

      {isRecurringModalOpen && (
        <RecurringBillingModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
