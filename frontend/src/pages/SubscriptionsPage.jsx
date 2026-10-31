import React from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { formatDate, formatCurrency } from '../utils/formatters';
import { Plus, Info } from 'lucide-react';

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

function getStatusBadge(status) {
  switch (status) {
    case 'active':
      return <Badge variant="success" size="sm" dot>Active</Badge>;
    case 'trialing':
      return <Badge variant="info" size="sm" dot>Trialing</Badge>;
    case 'paused':
      return <Badge variant="warning" size="sm" dot>Paused</Badge>;
    case 'cancelled':
    case 'expired':
      return <Badge variant="danger" size="sm" dot>Cancelled</Badge>;
    default:
      return <Badge variant="default" size="sm">{status}</Badge>;
  }
}

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Subscriptions"
        description="Manage lifecycle, renewals, billing intervals, and customer contracts."
        breadcrumbs={[
          { label: 'Brightloop', href: '/' },
          { label: 'Billing' },
          { label: 'Subscriptions' },
        ]}
        actions={
          <Button variant="primary" size="sm" leftIcon={Plus}>
            New Subscription (Planned)
          </Button>
        }
      />

      {/* Development Preview Transparency Notice */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Development Preview Mode:</span>
          <span className="ml-1 text-indigo-700">
            The table below demonstrates responsive UI styling with mock contracts. Live backend integration is scheduled for Phase 4.
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow isHoverable={false}>
            <TableHead>ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Billing Cycle</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Renewal Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SAMPLE_SUBSCRIPTIONS.map((sub) => (
            <TableRow key={sub.id}>
              <TableCell className="font-mono text-xs text-slate-500">{sub.id}</TableCell>
              <TableCell className="font-medium text-slate-900">{sub.customer}</TableCell>
              <TableCell className="text-slate-600">{sub.plan}</TableCell>
              <TableCell className="text-slate-600 capitalize">{sub.cycle}</TableCell>
              <TableCell className="font-semibold text-slate-900">{formatCurrency(sub.amount)}</TableCell>
              <TableCell>{getStatusBadge(sub.status)}</TableCell>
              <TableCell className="text-slate-500">{formatDate(sub.periodEnd)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
