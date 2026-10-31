import { apiClient } from './apiClient';

/**
 * Promotional Discounts API Service
 * Connects directly to FastAPI backend promotional endpoints (/api/v1/discounts).
 */
export const discountService = {
  /**
   * Lists discounts with server-side pagination, search, and active status filtering.
   *
   * @param {{
   *   page?: number,
   *   pageSize?: number,
   *   isActive?: boolean|string,
   *   search?: string
   * }} [params]
   * @returns {Promise<any>} PaginatedResponse<DiscountResponse>
   */
  async listDiscounts({ page = 1, pageSize = 20, isActive, search } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    if (search && search.trim()) {
      query.set('search', search.trim());
    }

    if (isActive !== undefined && isActive !== null && isActive !== '' && isActive !== 'all') {
      query.set('is_active', String(isActive === true || isActive === 'true'));
    }

    const response = await apiClient.get(`/discounts?${query.toString()}`);
    return response.data;
  },

  /**
   * Retrieves single promotional discount details.
   *
   * @param {string} discountId
   * @returns {Promise<any>} DiscountResponse
   */
  async getDiscount(discountId) {
    const response = await apiClient.get(`/discounts/${discountId}`);
    return response.data;
  },

  /**
   * Creates a new promotional discount or coupon code.
   *
   * @param {{
   *   code: string,
   *   description?: string|null,
   *   discount_type: 'percentage'|'fixed_amount',
   *   value: number|string,
   *   minimum_purchase_amount?: number|string,
   *   minimum_quantity?: number,
   *   valid_from: string,
   *   valid_until?: string|null,
   *   max_redemptions?: number|null,
   *   applicable_product_id?: string|null,
   *   applicable_plan_id?: string|null,
   *   is_active?: boolean
   * }} payload
   * @returns {Promise<any>} DiscountResponse
   */
  async createDiscount(payload) {
    const response = await apiClient.post('/discounts', payload);
    return response.data;
  },

  /**
   * Updates an existing discount's configuration.
   *
   * @param {string} discountId
   * @param {Object} payload Partial<DiscountUpdate>
   * @returns {Promise<any>} DiscountResponse
   */
  async updateDiscount(discountId, payload) {
    const response = await apiClient.put(`/discounts/${discountId}`, payload);
    return response.data;
  },

  /**
   * Deactivates a discount preventing further applications.
   *
   * @param {string} discountId
   * @returns {Promise<any>} DiscountResponse
   */
  async deactivateDiscount(discountId) {
    return this.updateDiscount(discountId, { is_active: false });
  },

  /**
   * Reactivates a previously disabled discount.
   *
   * @param {string} discountId
   * @returns {Promise<any>} DiscountResponse
   */
  async reactivateDiscount(discountId) {
    return this.updateDiscount(discountId, { is_active: true });
  },

  /**
   * Validates a coupon code against a prospective order subtotal, quantity, and product/plan restriction.
   * Available to all authenticated users (Admin, Staff, Customer).
   *
   * @param {{
   *   code: string,
   *   amount: number|string,
   *   quantity?: number,
   *   productId?: string|null,
   *   planId?: string|null
   * }} data
   * @returns {Promise<{
   *   valid: boolean,
   *   code: string,
   *   discount_type?: 'percentage'|'fixed_amount',
   *   value?: number,
   *   calculated_discount: number,
   *   message: string
   * }>} DiscountValidateResponse
   */
  async validateDiscountCode({ code, amount, quantity = 1, productId = null, planId = null }) {
    const response = await apiClient.post('/discounts/validate', {
      code: code ? code.trim().toUpperCase() : '',
      amount: parseFloat(amount) || 0,
      quantity: parseInt(quantity, 10) || 1,
      product_id: productId || null,
      plan_id: planId || null,
    });
    return response.data;
  },
};
