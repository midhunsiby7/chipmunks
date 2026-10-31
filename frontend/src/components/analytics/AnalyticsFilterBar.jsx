import React, { useState } from 'react';
import {
  Calendar,
  Download,
  RotateCcw,
  DollarSign,
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react';
import Button from '../ui/Button';
import { DATE_RANGE_OPTIONS } from '../../utils/analyticsUtils';

/**
 * Filter Toolbar and CSV Export Controller for the Analytics Center
 *
 * @param {{
 *   dateRange: string,
 *   onDateRangeChange: (val: string) => void,
 *   customStartDate: string,
 *   onCustomStartDateChange: (val: string) => void,
 *   customEndDate: string,
 *   onCustomEndDateChange: (val: string) => void,
 *   currency: string,
 *   onCurrencyChange: (val: string) => void,
 *   activeTab: string,
 *   onTabChange: (tab: string) => void,
 *   onExport: (type: 'invoices' | 'subscriptions' | 'payments' | 'summary') => void,
 *   onResetFilters: () => void,
 *   isFiltered: boolean,
 * }} props
 */
export default function AnalyticsFilterBar({
  dateRange,
  onDateRangeChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  currency,
  onCurrencyChange,
  activeTab,
  onTabChange,
  onExport,
  onResetFilters,
  isFiltered,
}) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Executive Overview' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'invoices', label: 'Invoices & Aging' },
    { id: 'payments', label: 'Payments & Gateway' },
    { id: 'customers_products', label: 'Customers & Products' },
    { id: 'taxes_discounts', label: 'Taxes & Discounts' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center overflow-x-auto border-b border-slate-200 gap-1 pb-px no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Export Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
        {/* Left Side: Filter Pickers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-slate-800 focus:outline-none cursor-pointer pr-2"
              aria-label="Reporting Date Range"
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Inputs if 'custom' is active */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none"
                aria-label="Start Date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none"
                aria-label="End Date"
              />
            </div>
          )}

          {/* Currency Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-slate-800 focus:outline-none cursor-pointer pr-2"
              aria-label="Reporting Currency"
            >
              <option value="all">All Currencies</option>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Right Side: CSV Export Action Dropdown */}
        <div className="relative shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportMenuOpen((prev) => !prev)}
            className="text-xs shadow-2xs font-medium flex items-center gap-1.5"
            aria-label="Export Analytics Report"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export Report (CSV)</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </Button>

          {isExportMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsExportMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Tabular Dataset
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('summary');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Executive KPI Summary</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('invoices');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>All Filtered Invoices</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('subscriptions');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>All Filtered Subscriptions</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('payments');
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  <span>All Settled Payments</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
