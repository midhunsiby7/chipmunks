import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingIndicator from '../components/ui/LoadingIndicator';
import TaxFormModal from '../components/taxes/TaxFormModal';
import TaxDetailsModal from '../components/taxes/TaxDetailsModal';
import TaxDeactivateDialog from '../components/taxes/TaxDeactivateDialog';
import { taxService } from '../services/taxService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Percent,
  Plus,
  Search,
  Eye,
  Edit,
  PowerOff,
  RotateCcw,
  RefreshCw,
  Globe,
} from 'lucide-react';

export default function TaxesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';
  const canManage = isAdmin || isStaff;

  // Query & pagination state
  const [taxes, setTaxes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taxToEdit, setTaxToEdit] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState(null);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [taxToDeactivate, setTaxToDeactivate] = useState(null);

  const fetchTaxes = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    taxService
      .listTaxRules({
        page,
        pageSize,
        countryCode: countryFilter || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      })
      .then((res) => {
        if (isMounted) {
          setTaxes(res.items || []);
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
              'Failed to load tax rules. Please verify backend connection and try again.'
          );
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, countryFilter, statusFilter, refreshTrigger]);

  // Action handlers
  const handleCreate = () => {
    setTaxToEdit(null);
    setIsFormOpen(true);
  };

  const handleEdit = (tax) => {
    setTaxToEdit(tax);
    setIsFormOpen(true);
  };

  const handleView = (tax) => {
    setSelectedTax(tax);
    setIsDetailsOpen(true);
  };

  const handlePromptDeactivate = (tax) => {
    setTaxToDeactivate(tax);
    setIsDeactivateDialogOpen(true);
  };

  const handleReactivate = async (tax) => {
    try {
      await taxService.reactivateTaxRule(tax.id);
      fetchTaxes();
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to reactivate tax rule. Please retry.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Configuration"
        description="Manage regional, national, and item-specific tax rules, GST slabs, and percentage or fixed calculations."
        breadcrumbs={[
          { label: 'System', href: '/taxes' },
          { label: 'Tax Rules', active: true },
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTaxes}
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            {canManage && (
              <Button variant="primary" size="sm" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-1.5" />
                New Tax Rule
              </Button>
            )}
          </div>
        }
      />

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Country Filter */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            maxLength={2}
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value.toUpperCase());
              setPage(1);
            }}
            placeholder="Filter by Country Code (e.g. IN, US)..."
            className="w-full pl-9 pr-4 py-2 text-sm uppercase font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
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
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* MAIN TABLE AREA */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <LoadingIndicator text="Loading tax configuration rules..." />
        </div>
      ) : error ? (
        <ErrorState title="Error Loading Tax Rules" message={error} onRetry={fetchTaxes} />
      ) : taxes.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="No Tax Rules Configured"
          description={
            countryFilter || statusFilter !== 'all'
              ? 'No tax rules match the current country code or status filter.'
              : 'Configure your first tax rule to automatically levy taxes on customer invoices.'
          }
          action={
            canManage && (
              <Button variant="primary" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add First Tax Rule
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
                  <th className="py-3 px-4">Tax Name & Code</th>
                  <th className="py-3 px-4">Rate & Type</th>
                  <th className="py-3 px-4">Jurisdiction</th>
                  <th className="py-3 px-4">Effective Dates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxes.map((tax) => {
                  return (
                    <tr key={tax.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3 px-4">
                        <div>
                          <span
                            onClick={() => handleView(tax)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer block"
                          >
                            {tax.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                            {tax.tax_code}
                          </span>
                        </div>
                      </td>

                      {/* Rate & Type */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-700 text-sm">
                          {tax.is_fixed ? formatCurrency(tax.rate_percentage) : `${tax.rate_percentage}%`}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {tax.is_fixed ? 'Flat fee' : 'Percentage levy'}
                        </span>
                      </td>

                      {/* Jurisdiction */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-semibold text-slate-800 text-xs uppercase">
                            {tax.country_code}
                          </span>
                          {tax.state_or_region && (
                            <span className="text-slate-500 text-xs">
                              ({tax.state_or_region})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Effective Dates */}
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {tax.effective_from || tax.effective_until ? (
                          <div>
                            {tax.effective_from ? formatDate(tax.effective_from) : 'Immediate'}
                            {' → '}
                            {tax.effective_until ? formatDate(tax.effective_until) : 'Indefinite'}
                          </div>
                        ) : (
                          <span className="text-slate-400">Always active</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {tax.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleView(tax)}
                            title="View Tax Details"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {canManage && (
                            <>
                              <button
                                onClick={() => handleEdit(tax)}
                                title="Edit Tax Rule"
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {tax.is_active ? (
                                <button
                                  onClick={() => handlePromptDeactivate(tax)}
                                  title="Deactivate Rule"
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <PowerOff className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(tax)}
                                  title="Reactivate Rule"
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
              Showing {taxes.length} of {totalCount} tax rules
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
      <TaxFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        taxToEdit={taxToEdit}
        onSuccess={fetchTaxes}
      />

      <TaxDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        taxRule={selectedTax}
        onEdit={handleEdit}
        onDeactivate={handlePromptDeactivate}
        onReactivate={handleReactivate}
        canManage={canManage}
      />

      <TaxDeactivateDialog
        isOpen={isDeactivateDialogOpen}
        onClose={() => setIsDeactivateDialogOpen(false)}
        taxRule={taxToDeactivate}
        onSuccess={fetchTaxes}
      />
    </div>
  );
}
