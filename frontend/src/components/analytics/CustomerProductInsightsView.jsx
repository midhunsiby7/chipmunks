import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  Layers,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { formatNumber } from '../../utils/formatters';

/**
 * Customer Growth & Product / Plan Analytics
 *
 * @param {{
 *   customers: Array<any>,
 *   subscriptions: Array<any>,
 *   invoices: Array<any>,
 *   products: Array<any>,
 *   plans: Array<any>,
 * }} props
 */
export default function CustomerProductInsightsView({
  customers,
  subscriptions,
  invoices,
  products,
  plans,
}) {
  const totalCustomers = customers.length;

  // Set of customer IDs holding at least one active subscription
  const activeCustomerIds = new Set(
    subscriptions
      .filter((s) => (s.status || '').toLowerCase() === 'active')
      .map((s) => s.customer_id || s.customer?.id)
      .filter(Boolean)
  );

  // Set of customer IDs holding at least one overdue or unpaid invoice
  const indebtedCustomerIds = new Set(
    invoices
      .filter((inv) => {
        const st = (inv.status || '').toLowerCase();
        return !['paid', 'cancelled', 'void'].includes(st) && Number(inv.amount_due ?? 0) > 0;
      })
      .map((inv) => inv.customer_id || inv.customer?.id)
      .filter(Boolean)
  );

  const activeSubscribersCount = activeCustomerIds.size;
  const indebtedCount = indebtedCustomerIds.size;
  const inactiveCount = Math.max(0, totalCustomers - activeSubscribersCount);

  return (
    <div className="space-y-6">
      {/* Customer Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-indigo-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Customer Accounts
              </span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {formatNumber(totalCustomers)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Verified accounts ({inactiveCount} without active plan)
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Subscribers
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 tracking-tight">
              {formatNumber(activeSubscribersCount)}
            </div>
            <div className="mt-1 text-xs text-emerald-600 font-medium">
              {totalCustomers > 0
                ? `${Math.round((activeSubscribersCount / totalCustomers) * 100)}% subscriber conversion`
                : '0% conversion'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Accounts with Unsettled Balance
              </span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {formatNumber(indebtedCount)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Accounts holding unpaid invoices
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Catalog Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products Summary */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Product Catalog Inventory</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Active catalog items available for quoting and subscription provisioning
              </CardDescription>
            </div>
            <Link
              to="/products"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              View Products
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length > 0 ? (
                  products.slice(0, 5).map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {prod.name}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            prod.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {prod.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {prod.created_at ? new Date(prod.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-xs text-slate-400">
                      No products defined in catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Subscription Plans Summary */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Subscription Plans</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Tiered pricing models and recurring billing rules
              </CardDescription>
            </div>
            <Link
              to="/plans"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              View Plans
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Plan Name</th>
                  <th className="py-2.5 px-4 text-center">Cadence</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.length > 0 ? (
                  plans.slice(0, 5).map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {plan.name}
                      </td>
                      <td className="py-2.5 px-4 text-center uppercase font-mono text-[10px] text-slate-600">
                        {plan.billing_interval || 'Monthly'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            plan.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {plan.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-xs text-slate-400">
                      No plans configured in catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
