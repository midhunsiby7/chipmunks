import React from 'react';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatCurrency } from '../utils/formatters';

const SAMPLE_SUBSCRIPTIONS = [
  {
    id: 'sub-001',
    customer: 'Acme Global Corp',
    plan: 'Enterprise Cloud (Yearly)',
    amount: 12000,
    cycle: 'yearly',
    status: 'active',
    periodEnd: '2027-10-31',
  },
  {
    id: 'sub-002',
    customer: 'TechNova Labs',
    plan: 'Pro Growth (Monthly)',
    amount: 249,
    cycle: 'monthly',
    status: 'active',
    periodEnd: '2026-11-30',
  },
  {
    id: 'sub-003',
    customer: 'Apex Logistics',
    plan: 'Starter Team (Monthly)',
    amount: 79,
    cycle: 'monthly',
    status: 'paused',
    periodEnd: '2026-11-15',
  },
  {
    id: 'sub-004',
    customer: 'Skyline Media',
    plan: 'Trial Tier (Weekly)',
    amount: 0,
    cycle: 'weekly',
    status: 'trialing',
    periodEnd: '2026-11-07',
  },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Subscriptions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage lifecycle, renewals, billing intervals, and customer contracts.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          + New Subscription (Planned)
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Billing Cycle
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Renewal Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200 text-sm">
            {SAMPLE_SUBSCRIPTIONS.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{sub.id}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{sub.customer}</td>
                <td className="px-6 py-4 text-slate-600">{sub.plan}</td>
                <td className="px-6 py-4 text-slate-600 capitalize">{sub.cycle}</td>
                <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(sub.amount)}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={sub.status} />
                </td>
                <td className="px-6 py-4 text-slate-500">{formatDate(sub.periodEnd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
