import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { subscriptionService } from '../../services/subscriptionService';
import {
  AlertTriangle,
  Pause,
  Play,
  XCircle,
  Power,
  Loader2,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function SubscriptionActionDialog({
  isOpen,
  onClose,
  onSuccess,
  action,
  subscription,
}) {
  const [reason, setReason] = useState('');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  if (!subscription || !action) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSubmitting(true);

    try {
      if (action === 'pause') {
        await subscriptionService.pauseSubscription(subscription.id, { reason });
      } else if (action === 'resume') {
        await subscriptionService.resumeSubscription(subscription.id);
      } else if (action === 'cancel') {
        await subscriptionService.cancelSubscription(subscription.id, {
          cancelAtPeriodEnd,
          reason,
        });
      } else if (action === 'close') {
        await subscriptionService.closeSubscription(subscription.id);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        `Failed to execute ${action} on subscription. Please try again.`;
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getActionConfig = () => {
    switch (action) {
      case 'pause':
        return {
          title: 'Pause Subscription Contract',
          icon: <Pause className="w-5 h-5 text-amber-500" />,
          btnText: 'Confirm Pause',
          btnVariant: 'secondary',
        };
      case 'resume':
        return {
          title: 'Resume Subscription Contract',
          icon: <Play className="w-5 h-5 text-emerald-500" />,
          btnText: 'Confirm Resume',
          btnVariant: 'primary',
        };
      case 'cancel':
        return {
          title: 'Cancel Subscription Contract',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          btnText: 'Confirm Cancellation',
          btnVariant: 'danger',
        };
      case 'close':
        return {
          title: 'Permanently Close Subscription',
          icon: <Power className="w-5 h-5 text-slate-700" />,
          btnText: 'Confirm Permanent Closure',
          btnVariant: 'danger',
        };
      default:
        return {
          title: 'Subscription Action',
          icon: <AlertTriangle className="w-5 h-5 text-indigo-500" />,
          btnText: 'Confirm',
          btnVariant: 'primary',
        };
    }
  };

  const config = getActionConfig();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2.5 text-slate-900">
          {config.icon}
          <span>{config.title}</span>
        </div>
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {serverError}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Subscription Code:</span>
            <span className="font-mono font-bold text-slate-800">{subscription.subscription_code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Status:</span>
            <span className="font-semibold capitalize text-slate-700">{subscription.status}</span>
          </div>
          {subscription.current_period_end && (
            <div className="flex justify-between">
              <span className="text-slate-500">Current Period End:</span>
              <span className="font-semibold text-slate-700">
                {formatDate(subscription.current_period_end)}
              </span>
            </div>
          )}
        </div>

        {action === 'pause' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Pausing will temporarily halt automatic recurring billing and invoice generation. The customer contract will remain preserved until resumed.
            </p>
            <div>
              <label htmlFor="pause-reason-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Pause (Optional)
              </label>
              <input
                id="pause-reason-input"
                type="text"
                placeholder="e.g. Seasonal suspension, customer request"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {action === 'resume' && (
          <p className="text-xs text-slate-600">
            Resuming will restore this subscription to <strong className="text-emerald-700">ACTIVE</strong> status. Recurring billing cycles and scheduled renewals will resume according to the plan interval.
          </p>
        )}

        {action === 'cancel' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Choose the cancellation policy and provide an optional termination reason.
            </p>

            <div className="space-y-2 bg-white p-3 border border-slate-200 rounded-lg text-xs">
              <label className="flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="cancelPolicy"
                  checked={cancelAtPeriodEnd}
                  onChange={() => setCancelAtPeriodEnd(true)}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold text-slate-800 block">
                    Cancel at End of Current Period (Recommended)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    The subscription remains active and paid services continue until {formatDate(subscription.current_period_end)}.
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 cursor-pointer pt-2 border-t border-slate-100">
                <input
                  type="radio"
                  name="cancelPolicy"
                  checked={!cancelAtPeriodEnd}
                  onChange={() => setCancelAtPeriodEnd(false)}
                  className="mt-0.5 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="font-bold text-red-700 block">Cancel Immediately</span>
                  <span className="text-[11px] text-slate-500">
                    Immediately terminates active contract and revokes ongoing entitlements.
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label htmlFor="cancel-reason-input" className="block text-xs font-semibold text-slate-700 mb-1">
                Cancellation Reason (Optional)
              </label>
              <textarea
                id="cancel-reason-input"
                rows={2}
                placeholder="Reason for cancellation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {action === 'close' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              Closing a subscription permanently concludes the contract lifecycle. This record cannot be resumed or restarted; new service will require a new subscription.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={config.btnVariant}
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-1.5 text-xs"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{config.btnText}</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
