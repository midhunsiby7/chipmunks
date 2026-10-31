import React from 'react';
import { Link } from 'react-router-dom';
import {
  Percent,
  Tag,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { formatCurrency, formatNumber } from '../../utils/formatters';

/**
 * Tax Rules & Promotional Discount Campaign Activity Report
 *
 * @param {{
 *   invoices: Array<any>,
 *   taxRules: Array<any>,
 *   discounts: Array<any>,
 *   currency: string,
 * }} props
 */
export default function TaxDiscountReportView({
  invoices,
  taxRules,
  discounts,
  currency,
}) {
  const displayCurrency = currency === 'all' ? 'INR' : currency;

  // Aggregate total historical taxes and discounts from non-cancelled invoices
  let totalHistoricalTax = 0;
  let totalHistoricalDiscounts = 0;

  invoices.forEach((inv) => {
    const status = (inv.status || '').toLowerCase();
    if (status === 'cancelled' || status === 'void') return;

    totalHistoricalTax += Number(inv.tax_amount ?? 0);
    totalHistoricalDiscounts += Number(inv.discount_amount ?? 0);
  });

  totalHistoricalTax = Math.round(totalHistoricalTax * 100) / 100;
  totalHistoricalDiscounts = Math.round(totalHistoricalDiscounts * 100) / 100;

  return (
    <div className="space-y-6">
      {/* High-Level Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Tax Liability Assessed
              </span>
              <Percent className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalHistoricalTax, displayCurrency)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Assessed across all verified, non-cancelled customer invoices
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Promotional Discounts Applied
              </span>
              <Tag className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 tracking-tight">
              {formatCurrency(totalHistoricalDiscounts, displayCurrency)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Total deduction granted via coupon campaigns and special terms
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Accuracy Notice */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3 text-xs text-blue-950">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-blue-900 leading-relaxed">
          <strong className="font-semibold">Statutory Accounting Notice:</strong> Tax liability figures reflect the immutable tax values captured on individual historical invoices at the moment of issuance. They are not simulated or re-calculated from current statutory rules, ensuring complete audit compliance.
        </p>
      </div>

      {/* Tax Rules & Discounts Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Rules Configuration */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-600" />
                <span>Regional Tax Rules</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Statutory tax configurations registered in system
              </CardDescription>
            </div>
            <Link
              to="/taxes"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              Tax Config
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Tax Rule Name</th>
                  <th className="py-2.5 px-4 text-center">Jurisdiction</th>
                  <th className="py-2.5 px-4 text-right">Rate</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxRules.length > 0 ? (
                  taxRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {rule.name}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                        {rule.country_code || 'IN'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                        {rule.rate}%
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            rule.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {rule.is_active ? 'Active' : 'Archived'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-xs text-slate-400">
                      No tax rules configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Promotional Discounts */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Promotional Coupons</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Discount campaigns and coupon redemptions
              </CardDescription>
            </div>
            <Link
              to="/discounts"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              Discounts
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Coupon Code</th>
                  <th className="py-2.5 px-4 text-center">Type & Value</th>
                  <th className="py-2.5 px-4 text-center">Redemptions</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discounts.length > 0 ? (
                  discounts.map((disc) => (
                    <tr key={disc.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">
                        {disc.code}
                      </td>
                      <td className="py-2.5 px-4 text-center font-medium text-slate-700">
                        {disc.discount_type === 'percentage'
                          ? `${disc.value}% off`
                          : formatCurrency(disc.value, displayCurrency)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="font-bold text-slate-800">
                          {formatNumber(disc.redemption_count || 0)}
                        </span>
                        {disc.max_redemptions && (
                          <span className="text-[10px] text-slate-400 ml-1">
                            / {disc.max_redemptions}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            disc.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {disc.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-xs text-slate-400">
                      No discount codes created.
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
