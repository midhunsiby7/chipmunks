import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import PaymentRecordModal from '../components/payments/PaymentRecordModal';
import PaymentDetailsModal from '../components/payments/PaymentDetailsModal';
import { paymentService } from '../services/paymentService';
import { userService } from '../services/userService';
import { invoiceService } from '../services/invoiceService';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  getPaymentStatusBadge,
  getPaymentMethodBadge,
} from '../utils/paymentValidation';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import {
  CreditCard,
  Plus,
  Search,
  Eye,
  RotateCcw,
  CheckCircle2,
  Clock,
  Zap,
  Building,
  Receipt,
  Copy,
  Check,
} from 'lucide-react';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const role = user?.role || 'customer';
  const isAdminOrStaff = role === 'admin' || role === 'staff';

  // Server-side paginated state
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // References
  const [customerMap, setCustomerMap] = useState({});
  const [invoiceMap, setInvoiceMap] = useState({});

  // Filter toolbar state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState(() => searchParams.get('customer_id') || '');
  const [invoiceFilter, setInvoiceFilter] = useState(() => searchParams.get('invoice_id') || '');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch reference customers for Admin/Staff resolution
  useEffect(() => {
    if (!isAdminOrStaff) return;
    let isMounted = true;
    userService
      .listUsers({ role: 'customer', pageSize: 100 })
      .then((res) => {
        if (!isMounted) return;
        const map = {};
        (res.items || []).forEach((c) => {
          map[c.id] = c;
        });
        setCustomerMap(map);
      })
      .catch((err) => console.error('Failed to resolve customers map:', err));

    return () => {
      isMounted = false;
    };
  }, [isAdminOrStaff]);

  // Fetch reference invoices for link resolution
  useEffect(() => {
    let isMounted = true;
    invoiceService
      .listInvoices({ pageSize: 100 })
      .then((res) => {
        if (!isMounted) return;
        const map = {};
        (res.items || []).forEach((inv) => {
          map[inv.id] = inv;
        });
        setInvoiceMap(map);
      })
      .catch((err) => console.error('Failed to resolve invoices map:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchPayments = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((c) => c + 1);
  }, []);

  // Fetch payments list
  useEffect(() => {
    let isMounted = true;

    paymentService
      .listPayments({
        page,
        pageSize,
        customerId: customerFilter || undefined,
        invoiceId: invoiceFilter || undefined,
      })
      .then((res) => {
        if (!isMounted) return;
        setPayments(res.items || []);
        setTotalCount(res.total || 0);
        setLoading(false);
        setError('');
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load payments:', err);
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          'Unable to load payment records. Please try again.';
        setError(msg);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, customerFilter, invoiceFilter, refreshTrigger]);

  // Deep-linking parameter inspection
  useEffect(() => {
    const deepPaymentId = searchParams.get('id');
    if (!deepPaymentId) return;

    paymentService
      .getPayment(deepPaymentId)
      .then((data) => {
        if (data) {
          setSelectedPayment(data);
          setIsDetailsModalOpen(true);
        }
      })
      .catch((err) => {
        console.warn('Could not auto-open deep-linked payment:', err);
      });
  }, [searchParams]);

  // Client-side text and method filtering on loaded records
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Status filter
      if (statusFilter !== 'all' && (p.status || '').toLowerCase() !== statusFilter) {
        return false;
      }

      // Method filter
      if (methodFilter !== 'all' && (p.payment_method || '').toLowerCase() !== methodFilter) {
        return false;
      }

      // Search term
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        const refMatch = (p.payment_reference || '').toLowerCase().includes(query);
        const notesMatch = (p.notes || '').toLowerCase().includes(query);
        const gwMatch = (p.gateway_transaction_id || '').toLowerCase().includes(query);
        const rzpPayMatch = (p.razorpay_payment_id || '').toLowerCase().includes(query);

        const customer = customerMap[p.customer_id];
        const custNameMatch = customer?.full_name?.toLowerCase().includes(query);
        const custEmailMatch = customer?.email?.toLowerCase().includes(query);

        const inv = invoiceMap[p.invoice_id];
        const invNumMatch = inv?.invoice_number?.toLowerCase().includes(query);

        return (
          refMatch ||
          notesMatch ||
          gwMatch ||
          rzpPayMatch ||
          custNameMatch ||
          custEmailMatch ||
          invNumMatch
        );
      }

      return true;
    });
  }, [payments, statusFilter, methodFilter, debouncedSearch, customerMap, invoiceMap]);

  // KPI Analytics calculations
  const totalVolume = useMemo(() => {
    return payments
      .filter((p) => (p.status || '').toLowerCase() === PAYMENT_STATUSES.COMPLETED)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const completedCount = useMemo(() => {
    return payments.filter((p) => (p.status || '').toLowerCase() === PAYMENT_STATUSES.COMPLETED).length;
  }, [payments]);

  const pendingCount = useMemo(() => {
    return payments.filter((p) => (p.status || '').toLowerCase() === PAYMENT_STATUSES.PENDING).length;
  }, [payments]);

  const razorpayCount = useMemo(() => {
    return payments.filter((p) => (p.payment_method || '').toLowerCase() === PAYMENT_METHODS.RAZORPAY).length;
  }, [payments]);

  // Handlers
  const handleCopy = (id, ref) => {
    navigator.clipboard?.writeText(ref);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleOpenDetails = (p) => {
    setSelectedPayment(p);
    setIsDetailsModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMethodFilter('all');
    setCustomerFilter('');
    setInvoiceFilter('');
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2.5">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            <span>Payments & Reconciliation</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track transactions, record manual allocations, and verify Razorpay test checkouts.
          </p>
        </div>

        {isAdminOrStaff && (
          <Button
            variant="primary"
            onClick={() => setIsRecordModalOpen(true)}
            className="self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button>
        )}
      </div>

      {/* KPI ANALYTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Volume */}
        <Card className="p-4 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Total Settled Volume
              </p>
              <h3 className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {formatCurrency(totalVolume)}
              </h3>
            </div>
            <div className="p-2.5 bg-indigo-100/70 text-indigo-700 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Reconciled across {completedCount} transactions
          </p>
        </Card>

        {/* Completed */}
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Completed
              </p>
              <h3 className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {completedCount}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Successfully captured & balanced
          </p>
        </Card>

        {/* Pending */}
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                Pending / Processing
              </p>
              <h3 className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {pendingCount}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Awaiting clearance or webhook
          </p>
        </Card>

        {/* Razorpay vs Manual */}
        <Card className="p-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">
                Razorpay Online
              </p>
              <h3 className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {razorpayCount}
              </h3>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {payments.length - razorpayCount} recorded offline
          </p>
        </Card>
      </div>

      {/* SEARCH AND FILTERS */}
      <Card className="p-4 bg-white border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, customer, or transaction ID..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value={PAYMENT_STATUSES.COMPLETED}>Completed</option>
              <option value={PAYMENT_STATUSES.PENDING}>Pending</option>
              <option value={PAYMENT_STATUSES.FAILED}>Failed</option>
              <option value={PAYMENT_STATUSES.REFUNDED}>Refunded</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Payment Methods</option>
              <option value={PAYMENT_METHODS.RAZORPAY}>Razorpay (Online)</option>
              <option value={PAYMENT_METHODS.BANK_TRANSFER}>Bank Transfer</option>
              <option value={PAYMENT_METHODS.CREDIT_CARD}>Credit / Debit Card</option>
              <option value={PAYMENT_METHODS.CASH}>Cash</option>
              <option value={PAYMENT_METHODS.MANUAL}>Manual Accounting</option>
              <option value={PAYMENT_METHODS.STRIPE}>Stripe</option>
              <option value={PAYMENT_METHODS.PAYPAL}>PayPal</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchTerm || statusFilter !== 'all' || methodFilter !== 'all' || customerFilter || invoiceFilter) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-2">
              <span>Active Filters:</span>
              {searchTerm && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">
                  Search: "{searchTerm}"
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium capitalize">
                  Status: {statusFilter}
                </span>
              )}
              {methodFilter !== 'all' && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium capitalize">
                  Method: {methodFilter}
                </span>
              )}
              {customerFilter && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                  Customer Filtered
                </span>
              )}
              {invoiceFilter && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                  Invoice Filtered
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </Card>

      {/* TABLE / LIST VIEW */}
      <Card className="overflow-hidden border border-slate-200">
        {loading ? (
          <div className="py-16 text-center">
            <LoadingIndicator message="Loading payment ledger from Brightloop backend..." />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState
              title="Unable to Load Payments"
              message={error}
              onRetry={fetchPayments}
            />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CreditCard}
              title="No Payment Records Found"
              message={
                searchTerm || statusFilter !== 'all' || methodFilter !== 'all'
                  ? 'No transactions matched your selected filter criteria. Try resetting filters.'
                  : 'No payment transactions have been recorded yet.'
              }
              action={
                isAdminOrStaff ? (
                  <Button variant="primary" onClick={() => setIsRecordModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Record First Payment
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3.5">
                    Reference
                  </th>
                  {isAdminOrStaff && (
                    <th scope="col" className="px-4 py-3.5">
                      Customer
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3.5">
                    Target Invoice
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Method & Source
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredPayments.map((p) => {
                  const statusBadge = getPaymentStatusBadge(p.status);
                  const methodBadge = getPaymentMethodBadge(p.payment_method);
                  const isRazorpay = p.payment_method === PAYMENT_METHODS.RAZORPAY;
                  const customer = customerMap[p.customer_id];
                  const linkedInvoice = invoiceMap[p.invoice_id];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Reference */}
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-800">
                            {p.payment_reference}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.id, p.payment_reference)}
                            title="Copy payment reference"
                            className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Customer (Admin/Staff only) */}
                      {isAdminOrStaff && (
                        <td className="px-4 py-3 text-slate-700">
                          <div className="max-w-[160px] truncate">
                            <span className="font-semibold block truncate">
                              {customer?.full_name || 'Customer'}
                            </span>
                            <span className="text-xs text-slate-400 block truncate">
                              {customer?.email || p.customer_id.slice(0, 8) + '...'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Invoice Link */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 font-mono text-xs">
                          <Receipt className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-indigo-600 font-medium">
                            {linkedInvoice?.invoice_number || p.invoice_id.slice(0, 8) + '...'}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(p.paid_at || p.created_at)}
                      </td>

                      {/* Method & Source */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {isRazorpay ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Zap className="w-3 h-3 mr-1 text-indigo-600" />
                              Razorpay
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              <Building className="w-3 h-3 mr-1 text-slate-400" />
                              {methodBadge.label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            statusBadge.variant === 'success'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : statusBadge.variant === 'warning'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : statusBadge.variant === 'danger'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {statusBadge.dot && (
                            <span
                              className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
                                statusBadge.variant === 'success'
                                  ? 'bg-emerald-500'
                                  : statusBadge.variant === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                            />
                          )}
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(p)}
                          title="View Payment Details"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SERVER-SIDE PAGINATION */}
        {!loading && filteredPayments.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
            <div>
              Showing{' '}
              <strong>{(page - 1) * pageSize + 1}</strong> to{' '}
              <strong>{Math.min(page * pageSize, totalCount)}</strong> of{' '}
              <strong>{totalCount}</strong> recorded payments
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Previous
              </button>
              <span className="font-medium text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* RECORD PAYMENT MODAL (ADMIN / STAFF) */}
      {isRecordModalOpen && (
        <PaymentRecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          onSuccess={() => {
            fetchPayments();
          }}
        />
      )}

      {/* PAYMENT DETAILS MODAL */}
      {isDetailsModalOpen && selectedPayment && (
        <PaymentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedPayment(null);
          }}
          payment={selectedPayment}
          customerName={customerMap[selectedPayment.customer_id]?.full_name}
          customerEmail={customerMap[selectedPayment.customer_id]?.email}
          invoiceNumber={invoiceMap[selectedPayment.invoice_id]?.invoice_number}
        />
      )}
    </div>
  );
}
