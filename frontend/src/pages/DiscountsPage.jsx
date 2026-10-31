import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import DiscountFormModal from '../components/discounts/DiscountFormModal';
import DiscountDetailsModal from '../components/discounts/DiscountDetailsModal';
import DiscountDeactivateDialog from '../components/discounts/DiscountDeactivateDialog';
import { discountService } from '../services/discountService';
import { productService } from '../services/productService';
import { planService } from '../services/planService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  formatDiscountValue,
  getDiscountStatus,
  canManageDiscounts,
  isDiscountExpired,
  isDiscountExhausted,
  DISCOUNT_TYPES,
} from '../utils/discountValidation';
import {
  Tag,
  Plus,
  Search,
  Eye,
  Edit,
  Power,
  RotateCcw,
  Percent,
  IndianRupee,
  Calendar,
  Layers,
  Package,
  ShoppingBag,
  Sliders,
  Check,
  Copy,
} from 'lucide-react';

export default function DiscountsPage() {
  const { user } = useAuth();
  const canManage = canManageDiscounts(user?.role);

  // Query & pagination state
  const [discounts, setDiscounts] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [plansMap, setPlansMap] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters & search
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Copy feedback state
  const [copiedCode, setCopiedCode] = useState(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [discountToEdit, setDiscountToEdit] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [discountToToggle, setDiscountToToggle] = useState(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load products and plans lookup to resolve friendly names in table
  useEffect(() => {
    let isMounted = true;
    async function fetchLookups() {
      try {
        const [prodRes, planRes] = await Promise.allSettled([
          productService.getProducts({ pageSize: 100 }),
          planService.listPlans({ pageSize: 100 }),
        ]);

        if (!isMounted) return;

        if (prodRes.status === 'fulfilled' && prodRes.value?.items) {
          const pMap = {};
          prodRes.value.items.forEach((p) => {
            pMap[p.id] = p;
          });
          setProductsMap(pMap);
        }

        if (planRes.status === 'fulfilled' && planRes.value?.items) {
          const plMap = {};
          planRes.value.items.forEach((pl) => {
            plMap[pl.id] = pl;
          });
          setPlansMap(plMap);
        }
      } catch {
        // Fallback gracefully
      }
    }
    fetchLookups();
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchDiscounts = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Backend accepts is_active query param (boolean)
    let isActiveParam;
    if (statusFilter === 'active') {
      isActiveParam = true;
    } else if (statusFilter === 'inactive') {
      isActiveParam = false;
    }

    discountService
      .listDiscounts({
        page,
        pageSize,
        isActive: isActiveParam,
        search: debouncedSearch,
      })
      .then((res) => {
        if (isMounted) {
          let items = res.items || [];

          // Client-side filtering for type or specific status sub-cases if needed
          if (typeFilter !== 'all') {
            items = items.filter((d) => d.discount_type === typeFilter);
          }

          if (statusFilter === 'expired') {
            items = items.filter((d) => isDiscountExpired(d.valid_until));
          } else if (statusFilter === 'exhausted') {
            items = items.filter((d) =>
              isDiscountExhausted(d.current_redemptions, d.max_redemptions)
            );
          }

          setDiscounts(items);
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
              'Failed to retrieve discounts catalogue. Please check network connectivity.'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, typeFilter, statusFilter, debouncedSearch, refreshTrigger]);

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreate = () => {
    setDiscountToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (discount) => {
    setDiscountToEdit(discount);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (discount) => {
    setSelectedDiscount(discount);
    setIsDetailsOpen(true);
  };

  const handleOpenToggle = (discount) => {
    setDiscountToToggle(discount);
    setIsDeactivateOpen(true);
  };

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const hasActiveFilters = search || typeFilter !== 'all' || statusFilter !== 'all';

  // Metrics computation from currently loaded items
  const activeCount = discounts.filter((d) => d.is_active).length;
  const totalRedemptions = discounts.reduce((sum, d) => sum + (d.current_redemptions || 0), 0);
  const percentageCount = discounts.filter((d) => d.discount_type === DISCOUNT_TYPES.PERCENTAGE).length;
  const fixedCount = discounts.filter((d) => d.discount_type === DISCOUNT_TYPES.FIXED_AMOUNT).length;

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <PageHeader
        title="Discounts & Promotions"
        subtitle="Manage promotional codes, percentage deductions, fixed discounts, and coupon redemption caps."
        badge={
          <Badge variant="purple" size="sm">
            Phase 7 — Active
          </Badge>
        }
        actions={
          canManage && (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Promo Code</span>
            </Button>
          )
        }
      />

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Promotions</span>
            <Tag className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <span className="text-[11px] text-slate-400">Configured promotional offers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Active Codes</span>
            <Percent className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</div>
          <span className="text-[11px] text-slate-400">Available for customer checkout</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Redemptions</span>
            <ShoppingBag className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">{totalRedemptions}</div>
          <span className="text-[11px] text-slate-400">Cumulative voucher redemptions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Type Split</span>
            <Sliders className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-800 mt-2 flex items-center gap-2">
            <span className="text-indigo-600">{percentageCount} Pct</span>
            <span className="text-slate-300">/</span>
            <span className="text-amber-600">{fixedCount} Flat</span>
          </div>
          <span className="text-[11px] text-slate-400">Percentage vs fixed deductions</span>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by code (e.g. WELCOME20) or campaign..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Discount Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            >
              <option value="all">All Discount Types</option>
              <option value={DISCOUNT_TYPES.PERCENTAGE}>Percentage (%)</option>
              <option value={DISCOUNT_TYPES.FIXED_AMOUNT}>Fixed Amount (₹)</option>
            </select>
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
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="expired">Expired</option>
              <option value="exhausted">Limit Exhausted</option>
            </select>
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
          <LoadingIndicator text="Loading discount catalogue..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to Load Discounts"
          message={error}
          action={
            <Button variant="secondary" onClick={fetchDiscounts}>
              Retry Connection
            </Button>
          }
        />
      ) : discounts.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={hasActiveFilters ? 'No Discounts Match Your Filters' : 'No Discounts Configured Yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search keywords, discount type, or status criteria.'
              : 'Create promotional voucher codes and seasonal campaigns to boost subscriptions.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            ) : canManage ? (
              <Button variant="primary" onClick={handleOpenCreate}>
                Create First Promo Code
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
                  <th className="py-3 px-4">Code & Campaign</th>
                  <th className="py-3 px-4">Deduction Value</th>
                  <th className="py-3 px-4">Eligibility</th>
                  <th className="py-3 px-4">Applicability Scope</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Redemptions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {discounts.map((discount) => {
                  const status = getDiscountStatus(discount);
                  const isPercentage = discount.discount_type === DISCOUNT_TYPES.PERCENTAGE;

                  // Resolve target product or plan
                  let scopeDisplay = 'Entire Order / Global';
                  if (discount.applicable_product_id) {
                    const prod = productsMap[discount.applicable_product_id];
                    scopeDisplay = prod ? `Product: ${prod.name}` : `Product: ${discount.applicable_product_id.slice(0, 8)}...`;
                  } else if (discount.applicable_plan_id) {
                    const pl = plansMap[discount.applicable_plan_id];
                    scopeDisplay = pl ? `Plan: ${pl.name}` : `Plan: ${discount.applicable_plan_id.slice(0, 8)}...`;
                  }

                  const currentRedemptions = discount.current_redemptions || 0;
                  const maxRedemptions = discount.max_redemptions;

                  return (
                    <tr
                      key={discount.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* CODE & DESCRIPTION */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCopyCode(discount.code)}
                            className="font-mono font-bold text-slate-900 uppercase tracking-wide hover:text-indigo-600 flex items-center space-x-1 group/btn text-sm"
                            title="Click to copy code"
                          >
                            <span>{discount.code}</span>
                            {copiedCode === discount.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400 group-hover/btn:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>
                        {discount.description && (
                          <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                            {discount.description}
                          </p>
                        )}
                      </td>

                      {/* DEDUCTION VALUE */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center space-x-1">
                          {isPercentage ? (
                            <Percent className="w-3.5 h-3.5 text-indigo-500" />
                          ) : (
                            <IndianRupee className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span>{formatDiscountValue(discount.discount_type, discount.value)}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider">
                          {isPercentage ? 'Percentage Off' : 'Flat Off'}
                        </span>
                      </td>

                      {/* ELIGIBILITY CRITERIA */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400">Min Spend: </span>
                          <span className="font-semibold text-slate-800">
                            {parseFloat(discount.minimum_purchase_amount || 0) > 0
                              ? formatCurrency(discount.minimum_purchase_amount)
                              : 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Min Qty: </span>
                          <span className="font-semibold text-slate-800">
                            {discount.minimum_quantity || 1}
                          </span>
                        </div>
                      </td>

                      {/* APPLICABILITY SCOPE */}
                      <td className="py-3.5 px-4 text-xs">
                        {discount.applicable_product_id ? (
                          <div className="flex items-center space-x-1.5 text-indigo-700 font-medium">
                            <Package className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{scopeDisplay}</span>
                          </div>
                        ) : discount.applicable_plan_id ? (
                          <div className="flex items-center space-x-1.5 text-purple-700 font-medium">
                            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{scopeDisplay}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5 text-slate-600">
                            <ShoppingBag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>Global (All Items)</span>
                          </div>
                        )}
                      </td>

                      {/* VALIDITY PERIOD */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {discount.valid_until
                              ? formatDate(discount.valid_until)
                              : 'Evergreen'}
                          </span>
                        </div>
                        {discount.valid_until && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            From: {formatDate(discount.valid_from)}
                          </span>
                        )}
                      </td>

                      {/* REDEMPTIONS */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-800">
                          {currentRedemptions} {maxRedemptions ? `/ ${maxRedemptions}` : ''}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {maxRedemptions ? `${Math.round((currentRedemptions / maxRedemptions) * 100)}% used` : 'Unlimited'}
                        </span>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            status.color === 'emerald'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : status.color === 'amber'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : status.color === 'red'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : status.color === 'blue'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status.color === 'emerald'
                                ? 'bg-emerald-500'
                                : status.color === 'amber'
                                ? 'bg-amber-500'
                                : status.color === 'red'
                                ? 'bg-red-500'
                                : status.color === 'blue'
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{status.label}</span>
                        </span>
                      </td>

                      {/* ROW ACTIONS */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenDetails(discount)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Inspect details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(discount)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit configuration"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleOpenToggle(discount)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  discount.is_active
                                    ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={discount.is_active ? 'Deactivate discount' : 'Reactivate discount'}
                              >
                                <Power className="w-4 h-4" />
                              </button>
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

          {/* PAGINATION TOOLBAR */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div>
                Showing page <strong className="font-semibold text-slate-900">{page}</strong> of{' '}
                <strong className="font-semibold text-slate-900">{totalPages}</strong> ({totalCount} total promotions)
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
        <DiscountFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchDiscounts}
          discountToEdit={discountToEdit}
        />
      )}

      {isDetailsOpen && (
        <DiscountDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          discount={selectedDiscount}
          onEdit={(d) => {
            setIsDetailsOpen(false);
            handleOpenEdit(d);
          }}
          onToggleActive={(d) => {
            setIsDetailsOpen(false);
            handleOpenToggle(d);
          }}
        />
      )}

      {isDeactivateOpen && (
        <DiscountDeactivateDialog
          isOpen={isDeactivateOpen}
          onClose={() => setIsDeactivateOpen(false)}
          onSuccess={fetchDiscounts}
          discount={discountToToggle}
        />
      )}
    </div>
  );
}
