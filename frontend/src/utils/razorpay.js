/**
 * Razorpay Standard Checkout Web SDK Loader and Executor (TEST MODE ONLY)
 * Connects client-side checkout modal to Brightloop's backend order creation and verification.
 */

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * Dynamically loads the official Razorpay Checkout script if not already present on window.
 *
 * @returns {Promise<boolean>}
 */
export function loadRazorpayCheckout() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    // Check if script tag is already in DOM
    const existingScript = document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load official checkout script from CDN.');
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

/**
 * Launches the official Razorpay Standard Checkout modal in test mode.
 *
 * @param {Object} params
 * @param {Object} params.orderData Backend RazorpayOrderResponse
 * @param {Object} params.invoice Invoice being paid
 * @param {Object} [params.user] Current authenticated user
 * @param {(response: { razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string }) => void} params.onSuccess
 * @param {(error: any) => void} [params.onFailure]
 * @param {() => void} [params.onDismiss]
 * @returns {Promise<boolean>}
 */
export async function launchRazorpayCheckout({
  orderData,
  invoice,
  user,
  onSuccess,
  onFailure,
  onDismiss,
}) {
  const loaded = await loadRazorpayCheckout();
  if (!loaded || !window.Razorpay) {
    throw new Error('Unable to initialize Razorpay Standard Checkout. Please check your network connection.');
  }

  const options = {
    key: orderData.key_id,
    amount: orderData.amount, // Authoritative amount in paise from backend
    currency: orderData.currency || 'INR',
    name: 'Brightloop Technologies',
    description: `Payment for Invoice ${invoice.invoice_number}`,
    order_id: orderData.order_id,
    prefill: {
      name: orderData.customer_name || user?.full_name || '',
      email: orderData.customer_email || user?.email || '',
    },
    theme: {
      color: '#4f46e5', // Brand Indigo-600
    },
    modal: {
      ondismiss: () => {
        onDismiss?.();
      },
    },
    handler: (response) => {
      // response: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
      onSuccess?.(response);
    },
  };

  const rzp = new window.Razorpay(options);

  if (typeof rzp.on === 'function') {
    rzp.on('payment.failed', (err) => {
      onFailure?.(err?.error || err);
    });
  }

  rzp.open();
  return true;
}
