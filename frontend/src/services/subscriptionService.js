import { apiClient } from './apiClient';

/**
 * Subscription Lifecycle API Service
 * Connects directly to FastAPI backend subscription endpoints (/api/v1/subscriptions).
 */
export const subscriptionService = {
  /**
   * Lists subscriptions with server-side pagination, status filtering, and customer scoping.
   * Customers are automatically scoped by backend token to their own records.
   *
   * @param {{
   *   page?: number,
   *   pageSize?: number,
   *   status?: string,
   *   customerId?: string
   * }} [params]
   * @returns {Promise<any>} PaginatedResponse<SubscriptionResponse>
   */
  async listSubscriptions({ page = 1, pageSize = 20, status, customerId } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    if (status && status !== 'all') {
      query.set('status', status.toLowerCase());
    }

    if (customerId && customerId.trim()) {
      query.set('customer_id', customerId.trim());
    }

    const response = await apiClient.get(`/subscriptions?${query.toString()}`);
    return response.data;
  },

  /**
   * Retrieves single subscription details including all loaded item lines.
   *
   * @param {string} subscriptionId
   * @returns {Promise<any>} SubscriptionResponse
   */
  async getSubscription(subscriptionId) {
    const response = await apiClient.get(`/subscriptions/${subscriptionId}`);
    return response.data;
  },

  /**
   * Creates a new customer subscription.
   *
   * @param {{
   *   customer_id: string,
   *   plan_id: string,
   *   quantity?: number,
   *   payment_terms?: string,
   *   start_date?: string|null,
   *   notes?: string|null,
   *   trial_days?: number,
   *   discount_code?: string|null,
   *   tax_rule_id?: string|null,
   *   lines?: Array<{
   *     product_variant_id?: string|null,
   *     description: string,
   *     quantity: number,
   *     unit_price: number|string
   *   }>
   * }} payload
   * @returns {Promise<any>} SubscriptionResponse
   */
  async createSubscription(payload) {
    const response = await apiClient.post('/subscriptions', payload);
    return response.data;
  },

  /**
   * Pauses an active subscription with optional operational reason.
   *
   * @param {string} subscriptionId
   * @param {{ reason?: string }} [data]
   * @returns {Promise<any>} SubscriptionResponse
   */
  async pauseSubscription(subscriptionId, { reason } = {}) {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/pause`, {
      reason: reason ? reason.trim() : null,
    });
    return response.data;
  },

  /**
   * Resumes a previously paused subscription.
   *
   * @param {string} subscriptionId
   * @returns {Promise<any>} SubscriptionResponse
   */
  async resumeSubscription(subscriptionId) {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/resume`);
    return response.data;
  },

  /**
   * Cancels a subscription immediately or flags cancellation at current billing period end.
   *
   * @param {string} subscriptionId
   * @param {{ cancelAtPeriodEnd?: boolean, reason?: string }} [data]
   * @returns {Promise<any>} SubscriptionResponse
   */
  async cancelSubscription(subscriptionId, { cancelAtPeriodEnd = true, reason } = {}) {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/cancel`, {
      cancel_at_period_end: cancelAtPeriodEnd,
      reason: reason ? reason.trim() : null,
    });
    return response.data;
  },

  /**
   * Permanently closes a subscription (Admin and Staff only).
   *
   * @param {string} subscriptionId
   * @returns {Promise<any>} SubscriptionResponse
   */
  async closeSubscription(subscriptionId) {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/close`);
    return response.data;
  },

  /**
   * Converts an accepted quotation into an active subscription.
   *
   * @param {string} quotationId
   * @param {{ startDate?: string|null }} [data]
   * @returns {Promise<any>} SubscriptionResponse
   */
  async convertQuotationToSubscription(quotationId, { startDate = null } = {}) {
    const response = await apiClient.post(`/quotations/${quotationId}/convert-to-subscription`, {
      quotation_id: quotationId,
      start_date: startDate || null,
    });
    return response.data;
  },
};
