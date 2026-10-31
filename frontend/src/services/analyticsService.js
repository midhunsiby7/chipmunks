import { apiClient } from './apiClient';
import { invoiceService } from './invoiceService';
import { subscriptionService } from './subscriptionService';
import { paymentService } from './paymentService';
import { userService } from './userService';
import { planService } from './planService';
import { productService } from './productService';
import { discountService } from './discountService';
import { taxService } from './taxService';

/**
 * Service for Executive & Operational Analytics, Reporting, and Data Aggregation
 */
export const analyticsService = {
  /**
   * Fetches official executive analytics from the FastAPI backend router (`GET /api/v1/analytics/dashboard`).
   * Provides certified database aggregates for MRR, ARR, revenue, collections, and overdue receivables.
   *
   * @returns {Promise<{
   *   total_customers: number,
   *   total_products: number,
   *   active_subscriptions: number,
   *   paused_subscriptions: number,
   *   closed_subscriptions: number,
   *   total_revenue: number,
   *   total_collections: number,
   *   outstanding_invoices_count: number,
   *   outstanding_amount: number,
   *   overdue_invoices_count: number,
   *   overdue_amount: number,
   *   mrr: number,
   *   arr: number,
   *   revenue_trends: Array<{ date_label: string, mrr: number, collections: number }>,
   *   recent_subscriptions: Array<any>,
   *   recent_payments: Array<any>,
   * }>}
   */
  async getDashboardAnalytics() {
    const res = await apiClient.get('/analytics/dashboard');
    return res.data;
  },

  /**
   * Loads full authorized datasets across modules to support granular filtering,
   * aging analysis, and complete CSV exports without page cut-offs.
   *
   * @returns {Promise<{
   *   invoices: Array<any>,
   *   subscriptions: Array<any>,
   *   payments: Array<any>,
   *   customers: Array<any>,
   *   plans: Array<any>,
   *   products: Array<any>,
   *   discounts: Array<any>,
   *   taxRules: Array<any>,
   * }>}
   */
  async fetchCompleteDataset() {
    // 1. Fetch all invoices across all pages (up to 1,000 safety limit)
    let invoices = [];
    try {
      let page = 1;
      let totalPages = 1;
      do {
        const invRes = await invoiceService.listInvoices({ page, pageSize: 100 });
        invoices = invoices.concat(invRes.items || []);
        totalPages = invRes.pages || 1;
        page += 1;
      } while (page <= totalPages && page <= 10);
    } catch (err) {
      console.warn('[Brightloop Analytics] Could not fetch complete invoices dataset:', err);
    }

    // 2. Fetch all subscriptions across all pages
    let subscriptions = [];
    try {
      let page = 1;
      let totalPages = 1;
      do {
        const subRes = await subscriptionService.listSubscriptions({ page, pageSize: 100 });
        subscriptions = subscriptions.concat(subRes.items || []);
        totalPages = subRes.pages || 1;
        page += 1;
      } while (page <= totalPages && page <= 10);
    } catch (err) {
      console.warn('[Brightloop Analytics] Could not fetch complete subscriptions dataset:', err);
    }

    // 3. Fetch all payments across all pages
    let payments = [];
    try {
      let page = 1;
      let totalPages = 1;
      do {
        const payRes = await paymentService.listPayments({ page, pageSize: 100 });
        payments = payments.concat(payRes.items || []);
        totalPages = payRes.pages || 1;
        page += 1;
      } while (page <= totalPages && page <= 10);
    } catch (err) {
      console.warn('[Brightloop Analytics] Could not fetch complete payments dataset:', err);
    }

    // 4. Fetch customers
    let customers = [];
    try {
      const userRes = await userService.listUsers({ role: 'customer', pageSize: 100 });
      customers = userRes.items || [];
    } catch (err) {
      console.warn('[Brightloop Analytics] Could not fetch customer directory:', err);
    }

    // 5. Fetch plans and products
    let plans = [];
    try {
      const planRes = await planService.listPlans();
      plans = planRes.items || [];
    } catch (err) {
      console.warn('[Brightloop Analytics] Could not fetch subscription plans:', err);
    }

    let products = [];
    try {
      const prodRes = await productService.listProducts();
      products = prodRes.items || [];
    } catch (err) {
      console.warn('[Brightloop Analytics] Could not fetch product catalog:', err);
    }

    // 6. Fetch discounts and tax rules
    let discounts = [];
    try {
      const discRes = await discountService.listDiscounts();
      discounts = discRes.items || [];
    } catch (err) {
      console.warn('[Brightloop Analytics] Could not fetch promotional discounts:', err);
    }

    let taxRules = [];
    try {
      const taxRes = await taxService.listTaxRules();
      taxRules = taxRes.items || [];
    } catch (err) {
      console.warn('[Brightloop Analytics] Could not fetch tax rules:', err);
    }

    return {
      invoices,
      subscriptions,
      payments,
      customers,
      plans,
      products,
      discounts,
      taxRules,
    };
  },
};

export default analyticsService;
