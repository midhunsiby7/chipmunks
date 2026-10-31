import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Skeleton } from '../components/ui/LoadingIndicator';
import { productService } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';
import ProductFormModal from '../components/products/ProductFormModal';
import ProductDetailsModal from '../components/products/ProductDetailsModal';
import ProductDeactivateDialog from '../components/products/ProductDeactivateDialog';
import {
  Package,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  PowerOff,
  Power,
  RotateCcw,
  AlertCircle,
  Layers,
} from 'lucide-react';

export default function ProductsPage() {
  const { role: currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productToToggle, setProductToToggle] = useState(null);

  const reloadProducts = useCallback(() => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch products
  useEffect(() => {
    let isMounted = true;
    productService
      .listProducts({
        page,
        pageSize,
        isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        search: searchTerm || undefined,
      })
      .then((response) => {
        if (isMounted) {
          let items = response.items || [];
          if (typeFilter !== 'all') {
            items = items.filter((p) => p.product_type?.toLowerCase() === typeFilter.toLowerCase());
          }
          setProducts(items);
          setTotal(response.total || 0);
          setTotalPages(response.pages || 1);
          setIsLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[Brightloop ProductsPage] Error loading products:', err);
          setError(err.message || 'Unable to load products from backend API.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, statusFilter, typeFilter, searchTerm, refreshTrigger]);

  const handleCreateNew = () => {
    setProductToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (product) => {
    setProductToEdit(product);
    setIsFormModalOpen(true);
  };

  const handleView = (product) => {
    setSelectedProduct(product);
  };

  const handleToggleStatus = (product) => {
    setProductToToggle(product);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title="Product Catalogue & Pricing"
        description="Catalog of SaaS products, multi-tier variant add-ons, and pricing schedules."
        breadcrumbs={[{ label: 'Brightloop', href: '/' }, { label: 'Products' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateNew}
            className="shadow-2xs text-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Product
          </Button>
        }
      />

      {/* Catalogue Card */}
      <Card>
        <CardHeader className="border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-base font-bold text-slate-900">
              Product Catalog ({total})
            </CardTitle>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, SKU, description..."
                className="w-full text-xs rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer py-1"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer py-1"
              >
                <option value="all">All Types</option>
                <option value="service">Services / SaaS</option>
                <option value="digital">Digital Products</option>
                <option value="physical">Physical Goods</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-rose-900">{error}</p>
              <Button variant="outline" size="sm" onClick={reloadProducts}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Try Again
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800">No Products in Catalogue</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No products match your search query or filter selection.'
                    : 'Start by creating your first SaaS service, product, or variant add-on.'}
                </p>
              </div>
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={handleCreateNew} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create Product
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product / SKU</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sales Price</TableHead>
                  {isAdmin && <TableHead>Cost Price</TableHead>}
                  <TableHead>Variants</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const variantCount = p.variants ? p.variants.length : 0;
                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {p.name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 uppercase truncate">
                              {p.sku}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {p.product_type}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {formatCurrency(p.sales_price)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {formatCurrency(p.cost_price)}
                        </TableCell>
                      )}
                      <TableCell>
                        {variantCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            <Layers className="w-3 h-3" />
                            {variantCount} variant{variantCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Standard</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? 'success' : 'danger'} size="sm">
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(p.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(p)}
                            className="text-xs text-slate-600 hover:text-indigo-600 p-1.5 h-auto"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(p)}
                            className="text-xs text-slate-600 hover:text-indigo-600 p-1.5 h-auto"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(p)}
                            className={`text-xs p-1.5 h-auto ${
                              p.is_active
                                ? 'text-slate-400 hover:text-rose-600'
                                : 'text-slate-400 hover:text-emerald-600'
                            }`}
                            title={p.is_active ? 'Deactivate Product' : 'Reactivate Product'}
                          >
                            {p.is_active ? (
                              <PowerOff className="w-3.5 h-3.5" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {!isLoading && !error && products.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Showing page {page} of {totalPages} ({total} total items)</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  className="text-xs"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Create & Edit Modal */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        productToEdit={productToEdit}
        isAdmin={isAdmin}
        onSuccess={reloadProducts}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        isAdmin={isAdmin}
      />

      {/* Product Deactivate Dialog */}
      <ProductDeactivateDialog
        isOpen={Boolean(productToToggle)}
        product={productToToggle}
        onClose={() => setProductToToggle(null)}
        onSuccess={reloadProducts}
      />
    </div>
  );
}
