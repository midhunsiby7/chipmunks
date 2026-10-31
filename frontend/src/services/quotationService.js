import { apiClient } from './apiClient';

/**
 * Quotation Management API Service
 * Connects directly to FastAPI backend quotation endpoints (/api/v1/quotations).
 */
export const quotationService = {
  /**
   * Lists quotations with server-side pagination, status, and customer filtering.
   *
   * @param {{
   *   page?: number,
   *   pageSize?: number,
   *   status?: string,
   *   customerId?: string
   * }} [params]
   * @returns {Promise<any>} PaginatedResponse<QuotationResponse>
   */
  async listQuotations({ page = 1, pageSize = 20, status, customerId } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    if (status && status !== 'all') {
      query.set('status', status.toLowerCase());
    }

    if (customerId && customerId.trim()) {
      query.set('customer_id', customerId.trim());
    }

    const response = await apiClient.get(`/quotations?${query.toString()}`);
    return response.data;
  },

  /**
   * Retrieves single quotation details including itemized lines.
   *
   * @param {string} quotationId
   * @returns {Promise<any>} QuotationResponse
   */
  async getQuotation(quotationId) {
    const response = await apiClient.get(`/quotations/${quotationId}`);
    return response.data;
  },

  /**
   * Creates a new customer quotation with itemized lines, taxes, and optional discount code.
   *
   * @param {{
   *   customer_id: string,
   *   template_id?: string|null,
   *   valid_until: string,
   *   terms_and_conditions?: string|null,
   *   notes?: string|null,
   *   lines: Array<{
   *     description: string,
   *     quantity: number|string,
   *     unit_price: number|string,
   *     product_variant_id?: string|null,
   *     plan_id?: string|null,
   *     discount_amount?: number|string,
   *     tax_amount?: number|string
   *   }>,
   *   discount_code?: string|null,
   *   tax_rule_id?: string|null
   * }} payload
   * @returns {Promise<any>} QuotationResponse
   */
  async createQuotation(payload) {
    const body = {
      customer_id: payload.customer_id,
      template_id: payload.template_id || null,
      valid_until: new Date(payload.valid_until).toISOString(),
      terms_and_conditions: payload.terms_and_conditions ? payload.terms_and_conditions.trim() : null,
      notes: payload.notes ? payload.notes.trim() : null,
      discount_code: payload.discount_code ? payload.discount_code.trim().toUpperCase() : null,
      tax_rule_id: payload.tax_rule_id || null,
      lines: payload.lines.map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity) || 1,
        unit_price: Number(l.unit_price) || 0,
        product_variant_id: l.product_variant_id || null,
        plan_id: l.plan_id || null,
        discount_amount: Number(l.discount_amount) || 0,
        tax_amount: Number(l.tax_amount) || 0,
      })),
    };

    const response = await apiClient.post('/quotations', body);
    return response.data;
  },

  /**
   * Dispatches/sends a draft quotation to the customer (transitions status: draft -> sent).
   *
   * @param {string} quotationId
   * @returns {Promise<any>} QuotationResponse
   */
  async sendQuotation(quotationId) {
    const response = await apiClient.post(`/quotations/${quotationId}/send`);
    return response.data;
  },

  /**
   * Records customer or administrative acceptance of a quotation (status -> accepted).
   *
   * @param {string} quotationId
   * @returns {Promise<any>} QuotationResponse
   */
  async acceptQuotation(quotationId) {
    const response = await apiClient.post(`/quotations/${quotationId}/accept`);
    return response.data;
  },

  /**
   * Records customer rejection of a quotation (status -> rejected).
   *
   * @param {string} quotationId
   * @returns {Promise<any>} QuotationResponse
   */
  async rejectQuotation(quotationId) {
    const response = await apiClient.post(`/quotations/${quotationId}/reject`);
    return response.data;
  },

  /**
   * Converts an accepted quotation into an active subscription.
   *
   * @param {string} quotationId
   * @param {{ start_date?: string }} [data]
   * @returns {Promise<any>} SubscriptionResponse
   */
  async convertToSubscription(quotationId, data = {}) {
    const body = {
      quotation_id: quotationId,
      start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
    };
    const response = await apiClient.post(`/quotations/${quotationId}/convert-to-subscription`, body);
    return response.data;
  },

  /**
   * Lists reusable quotation templates.
   *
   * @param {{ page?: number, pageSize?: number }} [params]
   * @returns {Promise<any>} PaginatedResponse<QuotationTemplateResponse>
   */
  async listTemplates({ page = 1, pageSize = 20 } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    const response = await apiClient.get(`/quotations/templates?${query.toString()}`);
    return response.data;
  },

  /**
   * Creates a new reusable quotation template.
   *
   * @param {{
   *   name: string,
   *   description?: string|null,
   *   default_validity_days?: number|string,
   *   terms_and_conditions?: string|null,
   *   is_active?: boolean
   * }} payload
   * @returns {Promise<any>} QuotationTemplateResponse
   */
  async createTemplate(payload) {
    const body = {
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : null,
      default_validity_days: Number(payload.default_validity_days) || 30,
      terms_and_conditions: payload.terms_and_conditions ? payload.terms_and_conditions.trim() : null,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    };

    const response = await apiClient.post('/quotations/templates', body);
    return response.data;
  },
};

export default quotationService;
