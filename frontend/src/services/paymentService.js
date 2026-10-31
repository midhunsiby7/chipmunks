import { apiClient } from './apiClient';

/**
 * Payment Management & Razorpay Checkout API Service
 * Connects directly to FastAPI backend payment endpoints (/api/v1/payments).
 */
export const paymentService = {
  /**
   * Lists payment transactions with server-side pagination, customer scoping, and invoice filtering.
   * Customers are automatically restricted by backend token to their own payment history.
   *
   * @param {{
   *   page?: number,
   *   pageSize?: number,
   *   customerId?: string,
   *   invoiceId?: string
   * }} [params]
   * @returns {Promise<any>} PaginatedResponse<PaymentResponse>
   */
  async listPayments({ page = 1, pageSize = 20, customerId, invoiceId } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    if (customerId && customerId.trim()) {
      query.set('customer_id', customerId.trim());
    }

    if (invoiceId && invoiceId.trim()) {
      query.set('invoice_id', invoiceId.trim());
    }

    const response = await apiClient.get(`/payments?${query.toString()}`);
    return response.data;
  },

  /**
   * Retrieves single payment transaction details.
   * Customer role isolation is enforced by the backend.
   *
   * @param {string} paymentId
   * @returns {Promise<any>} PaymentResponse
   */
  async getPayment(paymentId) {
    const response = await apiClient.get(`/payments/${paymentId}`);
    return response.data;
  },

  /**
   * Records a manual payment (Cash, Bank Transfer, Credit Card, etc.) against an invoice.
   * Enforces backend balance reconciliation and overpayment prevention.
   *
   * @param {{
   *   invoice_id: string,
   *   amount: number|string,
   *   currency?: string,
   *   payment_method: string,
   *   transaction_reference?: string|null,
   *   notes?: string|null
   * }} data
   * @returns {Promise<any>} PaymentResponse
   */
  async recordPayment(data) {
    const response = await apiClient.post('/payments', data);
    return response.data;
  },

  /**
   * Creates a server-side Razorpay order for online customer invoice checkout.
   * Returns order details, calculated amount in paise, currency, and trusted public key_id.
   *
   * @param {string} invoiceId
   * @returns {Promise<{
   *   order_id: string,
   *   amount: number,
   *   currency: string,
   *   key_id: string,
   *   invoice_id: string,
   *   customer_email: string,
   *   customer_name: string
   * }>} RazorpayOrderResponse
   */
  async createRazorpayOrder(invoiceId) {
    const response = await apiClient.post('/payments/razorpay/create-order', {
      invoice_id: invoiceId,
    });
    return response.data;
  },

  /**
   * Verifies Razorpay payment signature cryptographically on the backend.
   * Reconciles invoice balance atomically upon successful verification.
   *
   * @param {{
   *   razorpay_order_id: string,
   *   razorpay_payment_id: string,
   *   razorpay_signature: string
   * }} data
   * @returns {Promise<any>} PaymentResponse
   */
  async verifyRazorpayPayment(data) {
    const response = await apiClient.post('/payments/razorpay/verify', data);
    return response.data;
  },
};
