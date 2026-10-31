import { apiClient } from './apiClient';

/**
 * Product & Variant Catalog Service
 * Connects directly to FastAPI backend product endpoints (/api/v1/products).
 */
export const productService = {
  /**
   * Lists products with server-side pagination, search, and active status filtering.
   *
   * @param {{ page?: number, pageSize?: number, isActive?: boolean|string, search?: string }} [params]
   * @returns {Promise<any>} PaginatedResponse<ProductResponse>
   */
  async listProducts({ page = 1, pageSize = 20, isActive, search } = {}) {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('page_size', String(pageSize));

    if (isActive !== undefined && isActive !== null && isActive !== '' && isActive !== 'all') {
      query.set('is_active', String(isActive === true || isActive === 'true'));
    }

    if (search && search.trim()) {
      query.set('search', search.trim());
    }

    const response = await apiClient.get(`/products?${query.toString()}`);
    return response.data;
  },

  /**
   * Retrieves single product details including all loaded variants.
   *
   * @param {string} productId
   * @returns {Promise<any>} ProductResponse
   */
  async getProduct(productId) {
    const response = await apiClient.get(`/products/${productId}`);
    return response.data;
  },

  /**
   * Alias for listProducts for compatibility across catalog views.
   */
  async getProducts(params) {
    return this.listProducts(params);
  },

  /**
   * Creates a new catalog product with optional inline initial variants.
   *
   * @param {{
   *   name: string,
   *   sku: string,
   *   description?: string,
   *   product_type?: string,
   *   sales_price: number|string,
   *   cost_price?: number|string,
   *   internal_notes?: string,
   *   is_active?: boolean,
   *   variants?: Array<{
   *     name: string,
   *     variant_code: string,
   *     price: number|string,
   *     price_difference?: number|string,
   *     is_active?: boolean
   *   }>
   * }} payload
   * @returns {Promise<any>} ProductResponse
   */
  async createProduct(payload) {
    const response = await apiClient.post('/products', {
      name: payload.name.trim(),
      sku: payload.sku.trim().toUpperCase(),
      description: payload.description ? payload.description.trim() : null,
      product_type: payload.product_type || 'service',
      sales_price: Number(payload.sales_price) || 0,
      cost_price: Number(payload.cost_price) || 0,
      internal_notes: payload.internal_notes ? payload.internal_notes.trim() : null,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
      variants: payload.variants && payload.variants.length > 0
        ? payload.variants.map((v) => ({
            name: v.name.trim(),
            variant_code: v.variant_code.trim().toUpperCase(),
            price: Number(v.price) || 0,
            price_difference: Number(v.price_difference) || 0,
            is_active: v.is_active !== undefined ? v.is_active : true,
          }))
        : null,
    });
    return response.data;
  },

  /**
   * Updates an existing product record.
   *
   * @param {string} productId
   * @param {Partial<any>} payload
   * @returns {Promise<any>} ProductResponse
   */
  async updateProduct(productId, payload) {
    const body = {};
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.sku !== undefined) body.sku = payload.sku.trim().toUpperCase();
    if (payload.description !== undefined) body.description = payload.description ? payload.description.trim() : null;
    if (payload.product_type !== undefined) body.product_type = payload.product_type;
    if (payload.sales_price !== undefined) body.sales_price = Number(payload.sales_price);
    if (payload.cost_price !== undefined) body.cost_price = Number(payload.cost_price);
    if (payload.internal_notes !== undefined) body.internal_notes = payload.internal_notes ? payload.internal_notes.trim() : null;
    if (payload.is_active !== undefined) body.is_active = Boolean(payload.is_active);

    const response = await apiClient.put(`/products/${productId}`, body);
    return response.data;
  },

  /**
   * Deactivates a product safely via soft deactivation (is_active = false).
   *
   * @param {string} productId
   * @returns {Promise<any>} ProductResponse
   */
  async deactivateProduct(productId) {
    return this.updateProduct(productId, { is_active: false });
  },

  /**
   * Reactivates a deactivated product (is_active = true).
   *
   * @param {string} productId
   * @returns {Promise<any>} ProductResponse
   */
  async reactivateProduct(productId) {
    return this.updateProduct(productId, { is_active: true });
  },

  /**
   * Creates an additional variant on an existing product.
   *
   * @param {string} productId
   * @param {{
   *   name: string,
   *   variant_code: string,
   *   price: number|string,
   *   price_difference?: number|string,
   *   is_active?: boolean
   * }} payload
   * @returns {Promise<any>} ProductVariantResponse
   */
  async createVariant(productId, payload) {
    const response = await apiClient.post(`/products/${productId}/variants`, {
      name: payload.name.trim(),
      variant_code: payload.variant_code.trim().toUpperCase(),
      price: Number(payload.price) || 0,
      price_difference: Number(payload.price_difference) || 0,
      is_active: payload.is_active !== undefined ? payload.is_active : true,
    });
    return response.data;
  },

  /**
   * Updates an existing product variant.
   *
   * @param {string} variantId
   * @param {Partial<any>} payload
   * @returns {Promise<any>} ProductVariantResponse
   */
  async updateVariant(variantId, payload) {
    const body = {};
    if (payload.name !== undefined) body.name = payload.name.trim();
    if (payload.variant_code !== undefined) body.variant_code = payload.variant_code.trim().toUpperCase();
    if (payload.price !== undefined) body.price = Number(payload.price);
    if (payload.price_difference !== undefined) body.price_difference = Number(payload.price_difference);
    if (payload.is_active !== undefined) body.is_active = Boolean(payload.is_active);

    const response = await apiClient.put(`/products/variants/${variantId}`, body);
    return response.data;
  },

  /**
   * Deactivates or removes a variant.
   * If the variant is referenced in active subscriptions or quotations,
   * the backend will safely deactivate it instead of deleting.
   *
   * @param {string} variantId
   * @returns {Promise<{ status: string, action: string, message: string }>}
   */
  async deleteOrDeactivateVariant(variantId) {
    const response = await apiClient.delete(`/products/variants/${variantId}`);
    return response.data;
  },
};

export default productService;
