import React from 'react';
import { Calendar } from 'lucide-react';

const OPTIONS = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last Quarter' },
  { id: '1y', label: 'This Year' },
];

/**
 * Reusable Date Range Filter Selector
 *
 * @param {{
 *   value?: string,
 *   onChange?: (val: string) => void,
 *   className?: string
 * }} props
 */
export default function DateRangeFilter({
  value = '30d',
  onChange,
  className = '',
}) {
  return (
    <div className={`inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs ${className}`}>
      <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 shrink-0" />
      <div className="flex items-center gap-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange && onChange(opt.id)}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              value === opt.id
                ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
