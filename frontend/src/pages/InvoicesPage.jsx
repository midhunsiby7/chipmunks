import React from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { formatDate, formatCurrency } from '../utils/formatters';
import { Plus, Info } from 'lucide-react';

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

function getStatusBadge(status) {
  switch (status) {
    case 'paid':
      return <Badge variant="success" size="sm" dot>Paid</Badge>;
    case 'issued':
      return <Badge variant="primary" size="sm" dot>Issued</Badge>;
    case 'overdue':
      return <Badge variant="danger" size="sm" dot>Overdue</Badge>;
    case 'draft':
      return <Badge variant="default" size="sm" dot>Draft</Badge>;
    case 'void':
      return <Badge variant="default" size="sm">Void</Badge>;
    default:
      return <Badge variant="default" size="sm">{status}</Badge>;
  }
}

export default function InvoicesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Invoices"
        description="Automated recurring invoice generation, status tracking, and reconciliation."
        breadcrumbs={[
          { label: 'Brightloop', href: '/' },
          { label: 'Billing' },
          { label: 'Invoices' },
        ]}
        actions={
          <Button variant="primary" size="sm" leftIcon={Plus}>
            Create Invoice (Planned)
          </Button>
        }
      />

      {/* Development Preview Transparency Notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Development Preview Mode:</span>
          <span className="ml-1 text-indigo-700">
            The invoices below are mock data to verify table styling and status indicators. Backend invoice generation will connect in Phase 5.
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow isHoverable={false}>
            <TableHead>Invoice Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Issue Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Total Amount</TableHead>
            <TableHead>Amount Due</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SAMPLE_INVOICES.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-xs font-semibold text-slate-800">{inv.id}</TableCell>
              <TableCell className="font-medium text-slate-900">{inv.customer}</TableCell>
              <TableCell className="text-slate-500">{formatDate(inv.date)}</TableCell>
              <TableCell className="text-slate-500">{formatDate(inv.dueDate)}</TableCell>
              <TableCell className="font-semibold text-slate-900">{formatCurrency(inv.total)}</TableCell>
              <TableCell className={inv.amountDue > 0 ? 'font-semibold text-rose-600' : 'text-slate-500'}>
                {formatCurrency(inv.amountDue)}
              </TableCell>
              <TableCell>{getStatusBadge(inv.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
