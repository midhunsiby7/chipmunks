import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { paymentService } from '../../services/paymentService';
import { launchRazorpayCheckout } from '../../utils/razorpay';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import {
  CreditCard,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  XCircle,
  Receipt,
  RotateCcw,
} from 'lucide-react';

export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  invoice,
  customerName = null,
  onSuccess,
}) {
  const { user } = useAuth();

  // Lifecycle steps: 'idle' | 'creating_order' | 'checkout_active' | 'verifying' | 'success' | 'failed' | 'verification_failed'
  const [step, setStep] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [verifiedPayment, setVerifiedPayment] = useState(null);
  const [lastPaymentId, setLastPaymentId] = useState('');

  if (!invoice) return null;

  const handleStartCheckout = async () => {
    setStep('creating_order');
    setErrorMessage('');

    try {
      // 1. Request trusted order creation from FastAPI backend
      const orderData = await paymentService.createRazorpayOrder(invoice.id);

      setStep('checkout_active');

      // 2. Launch Razorpay Standard Web Checkout
      await launchRazorpayCheckout({
        orderData,
        invoice,
        user,
        onSuccess: async (rzpResponse) => {
          // 3. Received client callback -> send to backend for HMAC-SHA256 signature verification
          setStep('verifying');
          setLastPaymentId(rzpResponse.razorpay_payment_id);

          try {
            const verified = await paymentService.verifyRazorpayPayment({
              razorpay_order_id: rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature,
            });

            setVerifiedPayment(verified);
            setStep('success');
            onSuccess?.(verified);
          } catch (verifyErr) {
            console.error('Backend signature verification failed:', verifyErr);
            const msg =
              verifyErr?.response?.data?.detail ||
              'Payment signature verification failed. Please contact support with your payment ID.';
            setErrorMessage(msg);
            setStep('verification_failed');
          }
        },
        onFailure: (err) => {
          console.warn('Razorpay payment failed or was declined:', err);
          setErrorMessage(err?.description || err?.message || 'Payment was declined or cancelled by provider.');
          setStep('failed');
        },
        onDismiss: () => {
          setStep('idle');
          setErrorMessage('Checkout was closed before completing payment. No charges were made.');
        },
      });
    } catch (orderErr) {
      console.error('Failed to create Razorpay order:', orderErr);
      const msg =
        orderErr?.response?.data?.detail ||
        orderErr?.message ||
        'Unable to initialize online payment order. Please ensure the invoice has an active balance.';
      setErrorMessage(msg);
      setStep('failed');
    }
  };

  const handleSimulatePayment = async () => {
    setStep('creating_order');
    setErrorMessage('');

    try {
      // 1. Create trusted order on backend
      const orderData = await paymentService.createRazorpayOrder(invoice.id);
      setStep('verifying');

      const testPaymentId = `pay_mock_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      setLastPaymentId(testPaymentId);

      // 2. Cryptographic signature verification with backend test signature
      const verified = await paymentService.verifyRazorpayPayment({
        razorpay_order_id: orderData.order_id,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: 'mock_valid_signature_for_testing',
      });

      setVerifiedPayment(verified);
      setStep('success');
      onSuccess?.(verified);
    } catch (simErr) {
      console.error('Sandbox payment verification failed:', simErr);
      const msg =
        simErr?.response?.data?.detail ||
        simErr?.message ||
        'Sandbox payment verification failed.';
      setErrorMessage(msg);
      setStep('failed');
    }
  };

  const handleClose = () => {
    setStep('idle');
    setErrorMessage('');
    setVerifiedPayment(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pay Online via Razorpay</h2>
            <p className="text-xs text-slate-500">
              Official Razorpay Standard Checkout — Test Mode
            </p>
          </div>
        </div>
      }
      size="md"
    >
      <div className="space-y-5">
        {/* TEST MODE BANNER */}
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>Sandbox Environment:</strong> Test mode active. Use mock test cards or test UPI handles. No real money will be charged.
            </span>
          </div>
        </div>

        {/* STEP 1: IDLE / CHECKOUT PROMPT */}
        {(step === 'idle' || step === 'checkout_active' || step === 'creating_order') && (
          <div className="space-y-4">
            {/* INVOICE SUMMARY CARD */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Invoice Reference</span>
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {invoice.invoice_number}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Billed Customer:</span>
                  <span className="font-medium text-slate-800">
                    {customerName || user?.full_name || 'Valued Subscriber'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Due Date:</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(invoice.due_date)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Outstanding Payable Balance
                  </span>
                  <span className="text-xs text-slate-400">
                    (Total: {formatCurrency(invoice.total_amount, invoice.currency)})
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-indigo-600">
                  {formatCurrency(invoice.amount_due, invoice.currency)}
                </div>
              </div>
            </div>

            {/* ERROR NOTICE IF PREVIOUS ATTEMPT WAS DISMISSED OR FAILED */}
            {errorMessage && (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PAYMENT PROVIDER INFO */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-500 space-y-1">
              <div className="flex items-center space-x-2 font-semibold text-slate-700">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Supported Methods in Sandbox:</span>
              </div>
              <p>
                UPI (Google Pay, PhonePe, Paytm simulation), Credit/Debit Cards, NetBanking, and Wallets.
              </p>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulatePayment}
                disabled={step === 'creating_order'}
                className="text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs flex items-center justify-center font-semibold"
              >
                <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                1-Click Sandbox Test Pay
              </Button>

              <div className="flex items-center justify-end space-x-2">
                <Button variant="secondary" onClick={handleClose} disabled={step === 'creating_order'}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleStartCheckout}
                  disabled={step === 'creating_order'}
                >
                  {step === 'creating_order' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Initializing Razorpay Order...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2 text-indigo-200" />
                      Pay with Razorpay Modal
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFYING SIGNATURE WITH BACKEND */}
        {step === 'verifying' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Verifying Payment with Server...
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Received authorization from Razorpay. Cryptographically verifying payment signature with Brightloop FastAPI backend and updating invoice ledger.
            </p>
            {lastPaymentId && (
              <p className="font-mono text-xs text-slate-400">
                Razorpay Payment ID: {lastPaymentId}
              </p>
            )}
          </div>
        )}

        {/* STEP 3: SUCCESS STATE */}
        {step === 'success' && verifiedPayment && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Payment Succeeded & Verified!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your payment has been reconciled in the Brightloop subscription ledger.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl max-w-sm mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Brightloop Payment Ref:</span>
                <span className="font-mono font-bold text-slate-900">
                  {verifiedPayment.payment_reference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(verifiedPayment.amount, verifiedPayment.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Razorpay Payment ID:</span>
                <span className="font-mono text-slate-700">
                  {verifiedPayment.gateway_transaction_id || verifiedPayment.razorpay_payment_id}
                </span>
              </div>
            </div>

            <div className="pt-3">
              <Button variant="primary" onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: FAILURE OR VERIFICATION FAILED */}
        {(step === 'failed' || step === 'verification_failed') && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
              <XCircle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {step === 'verification_failed' ? 'Signature Verification Error' : 'Payment Failed'}
              </h3>
              <p className="text-xs text-red-600 mt-1 max-w-sm mx-auto">
                {errorMessage || 'Payment could not be completed.'}
              </p>
            </div>

            {lastPaymentId && (
              <p className="font-mono text-xs text-slate-400">
                Transaction Ref: {lastPaymentId}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-3 border-t border-slate-200">
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={handleSimulatePayment}
                className="text-indigo-700 border-indigo-300 font-semibold text-xs"
              >
                <Zap className="w-4 h-4 mr-1 text-amber-500" />
                Complete via Sandbox Test Pay
              </Button>
              <Button variant="primary" onClick={handleStartCheckout}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Razorpay Modal
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
