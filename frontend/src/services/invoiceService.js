import { apiClient } from './apiClient';

/**
 * Invoice Management & Recurring Billing API Service
 * Connects directly to FastAPI backend invoice endpoints (/api/v1/invoices).
 */
export const invoiceService = {
  /**
   * Lists invoices with server-side pagination, status filtering, and customer/subscription scoping.
   * Customers are automatically restricted by backend token to their own records.
   *
   * @param {{
   *   page?: number,
   *   pageSize?: number,
   *   status?: string,
   *   customerId?: string,
   *   subscriptionId?: string
   * }} [params]
   * @returns {Promise<any>} PaginatedResponse<InvoiceResponse>
   */
  async listInvoices({ page = 1, pageSize = 20, status, customerId, subscriptionId } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    if (status && status !== 'all') {
      query.set('status', status.toLowerCase());
    }

    if (customerId && customerId.trim()) {
      query.set('customer_id', customerId.trim());
    }

    if (subscriptionId && subscriptionId.trim()) {
      query.set('subscription_id', subscriptionId.trim());
    }

    const response = await apiClient.get(`/invoices?${query.toString()}`);
    return response.data;
  },

  /**
   * Retrieves single invoice details including loaded item lines and payments.
   *
   * @param {string} invoiceId
   * @returns {Promise<any>} InvoiceResponse
   */
  async getInvoice(invoiceId) {
    const response = await apiClient.get(`/invoices/${invoiceId}`);
    return response.data;
  },

  /**
   * Creates a manual invoice with itemized lines (Admin and Staff only).
   *
   * @param {{
   *   customer_id: string,
   *   subscription_id?: string|null,
   *   due_date: string,
   *   lines: Array<{
   *     description: string,
   *     quantity: number,
   *     unit_price: number|string
   *   }>,
   *   tax_rule_id?: string|null,
   *   discount_code?: string|null,
   *   currency?: string,
   *   notes?: string|null
   * }} payload
   * @returns {Promise<any>} InvoiceResponse
   */
  async createInvoice(payload) {
    const response = await apiClient.post('/invoices', payload);
    return response.data;
  },

  /**
   * Retrieves print-ready HTML document representation of the invoice.
   *
   * @param {string} invoiceId
   * @returns {Promise<string>} HTML string
   */
  async getInvoiceHtml(invoiceId) {
    const response = await apiClient.get(`/invoices/${invoiceId}/html`, {
      headers: { Accept: 'text/html' },
    });
    return response.data;
  },

  /**
   * Triggers the automated recurring billing engine to scan due active subscriptions
   * and idempotently generate invoices (Admin and Staff only).
   *
   * @param {{ targetDate?: string|null }} [params]
   * @returns {Promise<{
   *   invoices_generated: number,
   *   skipped_count: number,
   *   invoice_ids: string[],
   *   message: string
   * }>} RecurringBillingGenerateResponse
   */
  async generateRecurringInvoices({ targetDate = null } = {}) {
    const response = await apiClient.post('/invoices/generate-recurring', {
      target_date: targetDate || null,
    });
    return response.data;
  },

  /**
   * Cancels an unpaid invoice (Admin and Staff only).
   * Invoices with recorded payments cannot be cancelled.
   *
   * @param {string} invoiceId
   * @returns {Promise<any>} InvoiceResponse
   */
  async cancelInvoice(invoiceId) {
    const response = await apiClient.post(`/invoices/${invoiceId}/cancel`);
    return response.data;
  },
};
