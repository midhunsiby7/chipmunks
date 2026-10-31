import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
  getSubscriptionStatusBadge,
  isSubscriptionExpired,
  canPauseSubscription,
  canResumeSubscription,
  canCancelSubscription,
  canCloseSubscription,
} from '../../utils/subscriptionValidation';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';
import { formatBillingCadence } from '../../utils/planAndTaxValidation';
import { useAuth } from '../../hooks/useAuth';
import {
  Repeat,
  Clock,
  AlertTriangle,
  Pause,
  Play,
  XCircle,
  Power,
  Copy,
  Check,
  Package,
  FileText,
} from 'lucide-react';

export default function SubscriptionDetailsModal({
  isOpen,
  onClose,
  subscription,
  customerName = null,
  planName = null,
  onAction = null,
}) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!subscription) return null;

  const statusBadge = getSubscriptionStatusBadge(subscription.status);
  const isExpired = isSubscriptionExpired(subscription.expiry_date);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(subscription.subscription_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Derive chronological events for lifecycle history audit timeline
  const timelineEvents = [];
  if (subscription.created_at) {
    timelineEvents.push({
      date: subscription.created_at,
      title: 'Subscription Provisioned',
      desc: `Initial record created with status '${subscription.status}'`,
      type: 'create',
    });
  }
  if (subscription.start_date) {
    timelineEvents.push({
      date: subscription.start_date,
      title: 'Contract Effective Date',
      desc: 'First billing and subscription period initiated',
      type: 'start',
    });
  }
  if (subscription.paused_at) {
    timelineEvents.push({
      date: subscription.paused_at,
      title: 'Subscription Paused',
      desc: 'Recurring billing temporarily suspended',
      type: 'pause',
    });
  }
  if (subscription.cancelled_at) {
    timelineEvents.push({
      date: subscription.cancelled_at,
      title: 'Subscription Cancelled',
      desc: subscription.cancel_at_period_end
        ? 'Cancelled by subscriber; effective at period end'
        : 'Immediate cancellation enforced',
      type: 'cancel',
    });
  }
  if (subscription.closed_at) {
    timelineEvents.push({
      date: subscription.closed_at,
      title: 'Subscription Closed',
      desc: 'Permanently concluded by administrator',
      type: 'close',
    });
  }
  if (subscription.next_billing_date && subscription.status === 'active') {
    timelineEvents.push({
      date: subscription.next_billing_date,
      title: 'Scheduled Next Billing',
      desc: `Renewal invoice due for ${formatBillingCadence(subscription.billing_interval)} period`,
      type: 'future',
    });
  }

  // Sort timeline chronologically
  timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <span className="font-mono text-lg font-bold text-slate-900 tracking-wider">
              {subscription.subscription_code}
            </span>
            <span className="block text-xs font-normal text-slate-500">
              Subscription Contract Details & Lifecycle History
            </span>
          </div>
        </div>
      }
      size="xl"
    >
      <div className="space-y-6">
        {/* TOP STATUS BAR & HEADER CARD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-purple-50/50 rounded-xl border border-indigo-100">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Contract Value
            </span>
            <div className="text-2xl font-black text-indigo-700 flex items-center gap-2 mt-0.5">
              {formatCurrency(subscription.total_amount)}
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                / {subscription.billing_interval}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Copy subscription code"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <span
              className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                statusBadge.color === 'emerald'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : statusBadge.color === 'amber'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : statusBadge.color === 'red'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : statusBadge.color === 'blue'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {statusBadge.dot && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    statusBadge.color === 'emerald'
                      ? 'bg-emerald-500'
                      : statusBadge.color === 'amber'
                      ? 'bg-amber-500'
                      : statusBadge.color === 'red'
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`}
                />
              )}
              <span>{statusBadge.label}</span>
            </span>
          </div>
        </div>

        {/* CANCELLATION NOTICE IF PENDING PERIOD END */}
        {subscription.cancel_at_period_end && subscription.status === 'active' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-amber-800 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold">Cancellation Scheduled:</span> This subscription is scheduled to terminate at the end of the current period ({formatDate(subscription.current_period_end)}). Services remain active until then.
            </div>
          </div>
        )}

        {/* EXPIRATION NOTICE IF PAST EXPIRY */}
        {isExpired && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-red-800 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-600 mt-0.5" />
            <div>
              <span className="font-bold">Contract Expired:</span> Term passed on {formatDate(subscription.expiry_date)}. Renewal or contract reactivation required.
            </div>
          </div>
        )}

        {/* METRICS & REFERENCES GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Customer Account
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">
              {customerName || 'Subscriber Profile'}
            </div>
            <span className="text-[11px] text-slate-400 font-mono truncate block mt-0.5">
              ID: {subscription.customer_id ? `${subscription.customer_id.slice(0, 8)}...` : '—'}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Plan Association
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">
              {planName || 'Configured Plan'}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Qty / Seats: <strong className="text-slate-700">{subscription.quantity}</strong>
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Current Period End
            </span>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {formatDate(subscription.current_period_end)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              From: {formatDate(subscription.current_period_start)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Next Billing Event
            </span>
            <div className="text-sm font-bold text-indigo-700 mt-1">
              {subscription.status === 'active' ? formatDate(subscription.next_billing_date) : 'Suspended'}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Terms: {subscription.payment_terms || 'due_on_receipt'}
            </span>
          </div>
        </div>

        {/* ITEMIZED SUBSCRIPTION LINES */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <Package className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Itemized Line Items</h4>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscription.lines && subscription.lines.length > 0 ? (
                  subscription.lines.map((line, idx) => (
                    <tr key={line.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{line.description}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{line.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(line.unit_price)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(line.line_total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                      Base plan itemization only ({formatCurrency(subscription.subtotal)})
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FINANCIAL TOTALS BREAKDOWN */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subscription.subtotal)}</span>
              </div>
              {Number(subscription.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Applied:</span>
                  <span className="font-semibold">-{formatCurrency(subscription.discount_amount)}</span>
                </div>
              )}
              {Number(subscription.tax_amount) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax Assessment:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(subscription.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="text-indigo-600">{formatCurrency(subscription.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* NOTES & CONTRACT INSTRUCTIONS */}
        {subscription.notes && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Contract Notes & Log:
            </span>
            <p className="text-slate-600 whitespace-pre-line pl-5">{subscription.notes}</p>
          </div>
        )}

        {/* LIFECYCLE AUDIT TRAIL TIMELINE */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Subscription Lifecycle History</h4>
          </div>

          <div className="space-y-3 pl-2">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="relative flex items-start space-x-3 text-xs">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                    evt.type === 'create'
                      ? 'bg-indigo-500'
                      : evt.type === 'pause'
                      ? 'bg-amber-500'
                      : evt.type === 'cancel'
                      ? 'bg-red-500'
                      : evt.type === 'close'
                      ? 'bg-slate-500'
                      : evt.type === 'future'
                      ? 'bg-blue-400'
                      : 'bg-emerald-500'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{evt.title}</span>
                    <span className="text-[11px] text-slate-400">{formatDateTime(evt.date)}</span>
                  </div>
                  <span className="text-slate-500">{evt.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MODAL ACTIONS TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="flex items-center space-x-2">
            {canPauseSubscription(subscription) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onAction?.('pause', subscription);
                }}
                className="flex items-center space-x-1.5 text-xs text-amber-700 hover:bg-amber-50 border-amber-200"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Subscription</span>
              </Button>
            )}

            {canResumeSubscription(subscription) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onAction?.('resume', subscription);
                }}
                className="flex items-center space-x-1.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-200"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume Subscription</span>
              </Button>
            )}

            {canCancelSubscription(subscription) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onAction?.('cancel', subscription);
                }}
                className="flex items-center space-x-1.5 text-xs text-red-600 hover:bg-red-50 border-red-200"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Subscription</span>
              </Button>
            )}

            {canCloseSubscription(subscription, user?.role) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onAction?.('close', subscription);
                }}
                className="flex items-center space-x-1.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Close Contract</span>
              </Button>
            )}
          </div>

          <Button variant="secondary" onClick={onClose}>
            Close Window
          </Button>
        </div>
      </div>
    </Modal>
  );
}
