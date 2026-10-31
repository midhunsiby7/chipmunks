import { apiClient } from './apiClient';

/**
 * Subscription Plan API Service
 * Connects directly to FastAPI backend plan endpoints (/api/v1/plans).
 */
export const planService = {
  /**
   * Lists plans with server-side pagination, search, interval, and active status filtering.
   *
   * @param {{
   *   page?: number,
   *   pageSize?: number,
   *   billingInterval?: string,
   *   isActive?: boolean|string,
   *   search?: string
   * }} [params]
   * @returns {Promise<any>} PaginatedResponse<PlanResponse>
   */
  async listPlans({ page = 1, pageSize = 20, billingInterval, isActive, search } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    if (billingInterval && billingInterval !== 'all') {
      query.set('billing_interval', billingInterval.toLowerCase());
    }

    if (isActive !== undefined && isActive !== null && isActive !== '' && isActive !== 'all') {
      query.set('is_active', String(isActive === true || isActive === 'true'));
    }

    if (search && search.trim()) {
      query.set('search', search.trim());
    }

    const response = await apiClient.get(`/plans?${query.toString()}`);
    return response.data;
  },

  /**
   * Retrieves single subscription plan details.
   *
   * @param {string} planId
   * @returns {Promise<any>} PlanResponse
   */
  async getPlan(planId) {
    const response = await apiClient.get(`/plans/${planId}`);
    return response.data;
  },

  /**
   * Creates a new subscription plan.
   *
   * @param {{
   *   code: string,
   *   name: string,
   *   description?: string|null,
   *   billing_interval: string,
   *   interval_count?: number|string,
   *   price: number|string,
   *   currency?: string,
   *   trial_period_days?: number|string,
   *   minimum_quantity?: number|string,
   *   available_from?: string|null,
   *   available_until?: string|null,
   *   product_id?: string|null,
   *   is_active?: boolean
   * }} payload
   * @returns {Promise<any>} PlanResponse
   */
  async createPlan(payload) {
    const body = {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : null,
      billing_interval: payload.billing_interval.toLowerCase(),
      interval_count: payload.interval_count ? Number(payload.interval_count) : 1,
      price: Number(payload.price) || 0,
      currency: (payload.currency || 'USD').toUpperCase(),
      trial_period_days: payload.trial_period_days ? Number(payload.trial_period_days) : 0,
      minimum_quantity: payload.minimum_quantity ? Number(payload.minimum_quantity) : 1,
      available_from: payload.available_from ? new Date(payload.available_from).toISOString() : null,
      available_until: payload.available_until ? new Date(payload.available_until).toISOString() : null,
      product_id: payload.product_id ? payload.product_id : null,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    };

    const response = await apiClient.post('/plans', body);
    return response.data;
  },

  /**
   * Updates an existing subscription plan.
   *
   * @param {string} planId
   * @param {Partial<any>} payload
   * @returns {Promise<any>} PlanResponse
   */
  async updatePlan(planId, payload) {
    const body = {};
    if (payload.code !== undefined) body.code = payload.code.trim().toUpperCase();
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.description !== undefined) body.description = payload.description ? payload.description.trim() : null;
    if (payload.billing_interval !== undefined) body.billing_interval = payload.billing_interval.toLowerCase();
    if (payload.interval_count !== undefined) body.interval_count = Number(payload.interval_count);
    if (payload.price !== undefined) body.price = Number(payload.price);
    if (payload.currency !== undefined) body.currency = payload.currency.toUpperCase();
    if (payload.trial_period_days !== undefined) body.trial_period_days = Number(payload.trial_period_days);
    if (payload.minimum_quantity !== undefined) body.minimum_quantity = Number(payload.minimum_quantity);
    if (payload.available_from !== undefined) {
      body.available_from = payload.available_from ? new Date(payload.available_from).toISOString() : null;
    }
    if (payload.available_until !== undefined) {
      body.available_until = payload.available_until ? new Date(payload.available_until).toISOString() : null;
    }
    if (payload.product_id !== undefined) body.product_id = payload.product_id || null;
    if (payload.is_active !== undefined) body.is_active = Boolean(payload.is_active);

    const response = await apiClient.put(`/plans/${planId}`, body);
    return response.data;
  },

  /**
   * Closes a subscription plan safely via the backend lifecycle endpoint.
   * Sets is_active = false and available_until = now().
   *
   * @param {string} planId
   * @returns {Promise<any>} PlanResponse
   */
  async closePlan(planId) {
    const response = await apiClient.post(`/plans/${planId}/close`);
    return response.data;
  },

  /**
   * Reactivates a closed plan by setting is_active = true and clearing available_until.
   *
   * @param {string} planId
   * @returns {Promise<any>} PlanResponse
   */
  async reactivatePlan(planId) {
    return this.updatePlan(planId, { is_active: true, available_until: null });
  },
};

export default planService;
