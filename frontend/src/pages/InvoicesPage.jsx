import React from 'react';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatCurrency } from '../utils/formatters';

const SAMPLE_INVOICES = [
  {
    id: 'INV-2026-001',
    customer: 'Acme Global Corp',
    date: '2026-10-01',
    dueDate: '2026-10-15',
    total: 12000,
    amountDue: 0,
    status: 'paid',
  },
  {
    id: 'INV-2026-002',
    customer: 'TechNova Labs',
    date: '2026-10-15',
    dueDate: '2026-10-29',
    total: 249,
    amountDue: 249,
    status: 'issued',
  },
  {
    id: 'INV-2026-003',
    customer: 'Apex Logistics',
    date: '2026-09-15',
    dueDate: '2026-09-30',
    total: 79,
    amountDue: 79,
    status: 'overdue',
  },
];

export default function InvoicesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h2>
          <p className="text-sm text-slate-500 mt-1">
            Automated recurring invoice generation, status tracking, and reconciliation.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          + Create Invoice (Planned)
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Invoice Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Issue Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Amount Due
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200 text-sm">
            {SAMPLE_INVOICES.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-medium text-indigo-600 text-xs">{inv.id}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{inv.customer}</td>
                <td className="px-6 py-4 text-slate-500">{formatDate(inv.date)}</td>
                <td className="px-6 py-4 text-slate-500">{formatDate(inv.dueDate)}</td>
                <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(inv.total)}</td>
                <td className="px-6 py-4 font-semibold text-slate-900">{formatCurrency(inv.amountDue)}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={inv.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
