import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import {
  isQuotationExpired,
  getQuotationStatusBadgeConfig,
} from '../../utils/quotationValidation';
import {
  FileSpreadsheet,
  Printer,
  Send,
  CheckCircle2,
  XCircle,
  Repeat,
  AlertTriangle,
} from 'lucide-react';

export default function QuotationDetailsModal({
  isOpen,
  onClose,
  quotation,
  onSend,
  onAccept,
  onReject,
  onConvert,
  canManage = true,
  customerMap = {},
}) {
  if (!quotation) return null;

  const expired = isQuotationExpired(quotation.valid_until);
  const badgeConfig = getQuotationStatusBadgeConfig(quotation.status, expired);
  const customer = customerMap[quotation.customer_id] || null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sales Quotation: ${quotation.quotation_number}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 printable-quotation">
        {/* DOCUMENT HEADER BANNER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-700 shrink-0 mt-0.5">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
                  {quotation.quotation_number}
                </h3>
                <Badge variant={badgeConfig.variant}>{badgeConfig.label}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Issued on {formatDate(quotation.created_at)} • Valid until {formatDate(quotation.valid_until)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-slate-700 border-slate-300 hover:bg-slate-100"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* EXPIRED BANNER */}
        {expired && quotation.status !== 'converted' && quotation.status !== 'accepted' && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-800 text-xs font-medium">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="font-bold">Quotation Expired:</span> This quotation passed its validity deadline of {formatDateTime(quotation.valid_until)}. Quotations must be issued again or extended to permit acceptance.
            </div>
          </div>
        )}

        {/* CUSTOMER & DOCUMENT METADATA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Panel */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Recipient Customer
            </span>
            <p className="text-sm font-bold text-slate-900">
              {customer?.full_name || 'Customer Account'}
            </p>
            {customer?.company_name && (
              <p className="text-xs font-semibold text-slate-600">{customer.company_name}</p>
            )}
            <p className="text-xs text-slate-500">{customer?.email || quotation.customer_id}</p>
            {customer?.phone_number && (
              <p className="text-xs text-slate-500">{customer.phone_number}</p>
            )}
          </div>

          {/* Quotation Validity & Conversion Info */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quotation Terms
            </span>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Effective Date:</span>
              <span className="font-semibold text-slate-800">{formatDate(quotation.created_at)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Validity Expiry:</span>
              <span className={`font-semibold ${expired ? 'text-red-600' : 'text-slate-800'}`}>
                {formatDateTime(quotation.valid_until)}
              </span>
            </div>
            {quotation.converted_subscription_id && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-indigo-700">
                <span className="font-medium">Active Subscription:</span>
                <span className="font-mono text-[11px] font-bold">
                  {quotation.converted_subscription_id.slice(0, 8)}...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ITEMIZED LINES TABLE */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-4">Item & Description</th>
                <th className="py-2.5 px-4 text-center">Qty</th>
                <th className="py-2.5 px-4 text-right">Unit Price</th>
                <th className="py-2.5 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotation.lines?.map((line, idx) => (
                <tr key={line.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800 block text-xs md:text-sm">
                      {line.description}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-xs font-semibold text-slate-700">
                    {line.quantity}
                  </td>
                  <td className="py-3 px-4 text-right text-xs text-slate-600">
                    {formatCurrency(line.unit_price)}
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-bold text-slate-900">
                    {formatCurrency(line.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FINANCIAL SUMMARY & NOTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Notes & Terms */}
          <div className="space-y-3 text-xs text-slate-600">
            {quotation.notes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-700 block mb-0.5">Notes:</span>
                <p>{quotation.notes}</p>
              </div>
            )}
            {quotation.terms_and_conditions && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-700 block mb-0.5">Terms & Conditions:</span>
                <p>{quotation.terms_and_conditions}</p>
              </div>
            )}
          </div>

          {/* Totals Breakdown */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm text-sm">
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(quotation.subtotal)}</span>
            </div>

            {Number(quotation.discount_amount) > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 py-1">
                <span>Promotional Discount:</span>
                <span className="font-semibold">-{formatCurrency(quotation.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Tax Amount:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(quotation.tax_amount)}</span>
            </div>

            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-indigo-600">{formatCurrency(quotation.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* ACTIONS FOOTER */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose}>
            Back to Quotations
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Draft: Staff/Admin can Send */}
            {canManage && quotation.status === 'draft' && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onSend?.(quotation);
                }}
              >
                <Send className="w-4 h-4 mr-1.5" />
                Send to Customer
              </Button>
            )}

            {/* Sent or Draft: Customer or Staff can Accept or Reject */}
            {(quotation.status === 'sent' || (canManage && quotation.status === 'draft')) && !expired && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onReject?.(quotation);
                  }}
                  className="text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <XCircle className="w-4 h-4 mr-1.5 text-red-600" />
                  Reject Quotation
                </Button>

                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onAccept?.(quotation);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Accept Quotation
                </Button>
              </>
            )}

            {/* Accepted & Unconverted: Convert to Subscription */}
            {quotation.status === 'accepted' && !quotation.converted_subscription_id && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onConvert?.(quotation);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Repeat className="w-4 h-4 mr-1.5" />
                Convert to Active Subscription
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
