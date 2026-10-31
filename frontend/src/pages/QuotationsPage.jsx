import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import QuotationFormModal from '../components/quotations/QuotationFormModal';
import QuotationDetailsModal from '../components/quotations/QuotationDetailsModal';
import QuotationActionDialog from '../components/quotations/QuotationActionDialog';
import { quotationService } from '../services/quotationService';
import { userService } from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  isQuotationExpired,
  getQuotationStatusBadgeConfig,
} from '../utils/quotationValidation';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Repeat,
  RefreshCw,
} from 'lucide-react';

export default function QuotationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const canManage = isAdmin || isStaff;

  // Query & pagination state
  const [quotations, setQuotations] = useState([]);
  const [customerMap, setCustomerMap] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState({ type: null, quotation: null });

  // Debounce search by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load customer map once for customer lookup
  useEffect(() => {
    let isMounted = true;
    userService
      .listUsers({ role: 'customer', pageSize: 100 })
      .then((res) => {
        if (isMounted && res?.items) {
          const map = {};
          res.items.forEach((c) => {
            map[c.id] = c;
          });
          setCustomerMap(map);
        }
      })
      .catch(() => {
        // Fallback gracefully
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const triggerRefresh = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    quotationService
      .listQuotations({
        page,
        pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      .then((res) => {
        if (isMounted) {
          let items = res.items || [];
          if (debouncedSearch && debouncedSearch.trim()) {
            const pat = debouncedSearch.trim().toLowerCase();
            items = items.filter(
              (q) =>
                q.quotation_number.toLowerCase().includes(pat) ||
                (customerMap[q.customer_id]?.full_name || '').toLowerCase().includes(pat) ||
                (customerMap[q.customer_id]?.email || '').toLowerCase().includes(pat)
            );
          }
          setQuotations(items);
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
              'Failed to load sales quotations. Please verify connection and retry.'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, statusFilter, debouncedSearch, refreshTrigger, customerMap]);

  // Actions
  const handleOpenAction = (type, quotation) => {
    setActionTarget({ type, quotation });
    setIsActionDialogOpen(true);
  };

  const handleView = (quotation) => {
    setSelectedQuotation(quotation);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={canManage ? 'Sales Quotations' : 'My Quotations'}
        description={
          canManage
            ? 'Draft client proposals, configure products and recurring cadences, apply taxes, and convert accepted quotes to subscriptions.'
            : 'Review proposals, pricing breakdowns, validity terms, and accept or decline active quotations.'
        }
        breadcrumbs={[
          { label: 'Sales', href: '/quotations' },
          { label: 'Quotations', active: true },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={triggerRefresh}
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            {canManage && (
              <Button variant="primary" size="sm" onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create Quotation
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
            placeholder="Search by quotation number (QUO-...) or customer name..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Status Filter */}
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
            <option value="draft">Draft</option>
            <option value="sent">Sent to Customer</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {/* MAIN TABLE AREA */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <LoadingIndicator text="Loading sales quotations..." />
        </div>
      ) : error ? (
        <ErrorState title="Error Loading Quotations" message={error} onRetry={triggerRefresh} />
      ) : quotations.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No Sales Quotations Found"
          description={
            debouncedSearch || statusFilter !== 'all'
              ? 'No quotations match your current search or status filter criteria.'
              : canManage
              ? 'Prepare your first customer quotation using catalogue products or subscription plans.'
              : 'You do not have any quotations issued to your account yet.'
          }
          action={
            canManage && (
              <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Draft First Quotation
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
                  <th className="py-3 px-4">Quotation Number</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((quotation) => {
                  const customer = customerMap[quotation.customer_id] || null;
                  const expired = isQuotationExpired(quotation.valid_until);
                  const badgeConfig = getQuotationStatusBadgeConfig(quotation.status, expired);

                  return (
                    <tr key={quotation.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Quotation Number */}
                      <td className="py-3 px-4">
                        <span
                          onClick={() => handleView(quotation)}
                          className="font-mono font-bold text-slate-900 hover:text-indigo-600 cursor-pointer block text-xs"
                        >
                          {quotation.quotation_number}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {quotation.lines?.length || 0} line items
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 text-xs block">
                          {customer?.full_name || 'Customer'}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[160px]">
                          {customer?.email || quotation.customer_id}
                        </span>
                      </td>

                      {/* Issue Date */}
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {formatDate(quotation.created_at)}
                      </td>

                      {/* Expiry / Validity */}
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>Until {formatDate(quotation.valid_until)}</div>
                        {expired && quotation.status !== 'converted' && quotation.status !== 'accepted' && (
                          <span className="text-red-500 font-semibold block text-[11px]">
                            Expired
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-sm">
                          {formatCurrency(quotation.total_amount)}
                        </span>
                        {Number(quotation.discount_amount) > 0 && (
                          <span className="text-[11px] text-emerald-600 block">
                            Disc: -{formatCurrency(quotation.discount_amount)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleView(quotation)}
                            title="Inspect Details"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Send if Draft and Staff/Admin */}
                          {canManage && quotation.status === 'draft' && (
                            <button
                              onClick={() => handleOpenAction('send', quotation)}
                              title="Send to Customer"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Accept / Reject if Sent and not expired */}
                          {(quotation.status === 'sent' || (canManage && quotation.status === 'draft')) && !expired && (
                            <>
                              <button
                                onClick={() => handleOpenAction('accept', quotation)}
                                title="Accept Quotation"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenAction('reject', quotation)}
                                title="Reject Quotation"
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Convert to Subscription if Accepted */}
                          {quotation.status === 'accepted' && !quotation.converted_subscription_id && (
                            <button
                              onClick={() => handleOpenAction('convert', quotation)}
                              title="Convert to Subscription"
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded font-semibold"
                            >
                              <Repeat className="w-4 h-4" />
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

          {/* SERVER-SIDE PAGINATION */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {quotations.length} of {totalCount} sales quotations
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
      <QuotationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={triggerRefresh}
      />

      <QuotationDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        quotation={selectedQuotation}
        onSend={(q) => handleOpenAction('send', q)}
        onAccept={(q) => handleOpenAction('accept', q)}
        onReject={(q) => handleOpenAction('reject', q)}
        onConvert={(q) => handleOpenAction('convert', q)}
        canManage={canManage}
        customerMap={customerMap}
      />

      <QuotationActionDialog
        isOpen={isActionDialogOpen}
        onClose={() => setIsActionDialogOpen(false)}
        actionType={actionTarget.type}
        quotation={actionTarget.quotation}
        onSuccess={triggerRefresh}
      />
    </div>
  );
}
