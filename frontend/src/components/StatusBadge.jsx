import React from 'react';

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  trialing: 'bg-blue-50 text-blue-700 border-blue-200',
  issued: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  paused: 'bg-purple-50 text-purple-700 border-purple-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
  expired: 'bg-zinc-100 text-zinc-700 border-zinc-300',
};

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  const style = STATUS_STYLES[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${style}`}
    >
      {status || 'Unknown'}
    </span>
  );
}
