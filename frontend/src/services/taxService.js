import { apiClient } from './apiClient';

/**
 * Tax Rules API Service
 * Connects directly to FastAPI backend tax endpoints (/api/v1/taxes).
 */
export const taxService = {
  /**
   * Lists tax rules with server-side pagination, country code, and active status filtering.
   *
   * @param {{
   *   page?: number,
   *   pageSize?: number,
   *   countryCode?: string,
   *   isActive?: boolean|string
   * }} [params]
   * @returns {Promise<any>} PaginatedResponse<TaxRuleResponse>
   */
  async listTaxRules({ page = 1, pageSize = 20, countryCode, isActive } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    if (countryCode && countryCode.trim()) {
      query.set('country_code', countryCode.trim().toUpperCase());
    }

    if (isActive !== undefined && isActive !== null && isActive !== '' && isActive !== 'all') {
      query.set('is_active', String(isActive === true || isActive === 'true'));
    }

    const response = await apiClient.get(`/taxes?${query.toString()}`);
    return response.data;
  },

  /**
   * Retrieves single tax rule details.
   *
   * @param {string} ruleId
   * @returns {Promise<any>} TaxRuleResponse
   */
  async getTaxRule(ruleId) {
    const response = await apiClient.get(`/taxes/${ruleId}`);
    return response.data;
  },

  /**
   * Creates a new regional or national tax rule.
   *
   * @param {{
   *   name: string,
   *   tax_code: string,
   *   rate_percentage: number|string,
   *   is_fixed?: boolean,
   *   country_code: string,
   *   state_or_region?: string|null,
   *   effective_from?: string|null,
   *   effective_until?: string|null,
   *   is_active?: boolean
   * }} payload
   * @returns {Promise<any>} TaxRuleResponse
   */
  async createTaxRule(payload) {
    const body = {
      name: payload.name.trim(),
      tax_code: payload.tax_code.trim().toUpperCase(),
      rate_percentage: Number(payload.rate_percentage) || 0,
      is_fixed: Boolean(payload.is_fixed),
      country_code: payload.country_code.trim().toUpperCase(),
      state_or_region: payload.state_or_region ? payload.state_or_region.trim() : null,
      effective_from: payload.effective_from ? new Date(payload.effective_from).toISOString() : null,
      effective_until: payload.effective_until ? new Date(payload.effective_until).toISOString() : null,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    };

    const response = await apiClient.post('/taxes', body);
    return response.data;
  },

  /**
   * Updates an existing tax rule.
   *
   * @param {string} ruleId
   * @param {Partial<any>} payload
   * @returns {Promise<any>} TaxRuleResponse
   */
  async updateTaxRule(ruleId, payload) {
    const body = {};
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.tax_code !== undefined) body.tax_code = payload.tax_code.trim().toUpperCase();
    if (payload.rate_percentage !== undefined) body.rate_percentage = Number(payload.rate_percentage);
    if (payload.is_fixed !== undefined) body.is_fixed = Boolean(payload.is_fixed);
    if (payload.country_code !== undefined) body.country_code = payload.country_code.trim().toUpperCase();
    if (payload.state_or_region !== undefined) {
      body.state_or_region = payload.state_or_region ? payload.state_or_region.trim() : null;
    }
    if (payload.effective_from !== undefined) {
      body.effective_from = payload.effective_from ? new Date(payload.effective_from).toISOString() : null;
    }
    if (payload.effective_until !== undefined) {
      body.effective_until = payload.effective_until ? new Date(payload.effective_until).toISOString() : null;
    }
    if (payload.is_active !== undefined) body.is_active = Boolean(payload.is_active);

    const response = await apiClient.put(`/taxes/${ruleId}`, body);
    return response.data;
  },

  /**
   * Deactivates a tax rule safely (soft-deactivation via is_active = false).
   *
   * @param {string} ruleId
   * @returns {Promise<any>} TaxRuleResponse
   */
  async deactivateTaxRule(ruleId) {
    return this.updateTaxRule(ruleId, { is_active: false });
  },

  /**
   * Reactivates a deactivated tax rule.
   *
   * @param {string} ruleId
   * @returns {Promise<any>} TaxRuleResponse
   */
  async reactivateTaxRule(ruleId) {
    return this.updateTaxRule(ruleId, { is_active: true });
  },
};

export default taxService;
