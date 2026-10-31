import React from 'react';

export default function MetricCard({ title, value, change, changeType = 'positive', icon: Icon }) {
  const isPositive = changeType === 'positive';
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {change && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
