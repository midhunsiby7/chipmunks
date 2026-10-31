import { apiClient } from './apiClient';
import { userService } from './userService';
import { subscriptionService } from './subscriptionService';
import { quotationService } from './quotationService';
import { invoiceService } from './invoiceService';
import { paymentService } from './paymentService';
import { computeCustomerMetrics } from '../utils/customerPortalValidation';
import { fetchAllPages } from '../utils/paginationHelper';

export { computeCustomerMetrics };

/**
 * Dashboard Aggregation & Metrics Service
 *
 * Integrates real backend counts where available (e.g., User directory totals).
 * When specific business domain analytics (MRR, invoices, subscriptions) are
 * scheduled for future phases (Phase 4, Phase 7, Phase 10), it transparently
 * flags them as pending backend implementation, preventing fabrication of numbers.
 */
export const dashboardService = {
  /**
   * Fetches metrics for the Admin Dashboard.
   * @returns {Promise<{
   *   customerCount: number,
   *   staffCount: number,
   *   totalUsers: number,
   *   analyticsAvailable: boolean,
   *   mrr: number|null,
   *   activeSubscriptions: number|null,
   *   collectedRevenue: number|null,
   *   pendingInvoices: number|null,
   *   overdueInvoices: number|null,
   *   monthlyRevenueTrend: Array<{ month: string, revenue: number }>|null,
   *   subscriptionDistribution: Array<{ name: string, value: number }>|null,
   *   missingEndpoints: string[],
   * }>}
   */
  async getAdminMetrics() {
    const missingEndpoints = [];
    let customerCount = 0;
    let staffCount = 0;
    let totalUsers = 0;

    // 1. Fetch real customer total from backend
    try {
      const customersRes = await userService.listUsers({ page: 1, pageSize: 1, role: 'customer' });
      customerCount = customersRes.total ?? 0;
    } catch (err) {
      console.warn('[Brightloop Dashboard] Could not fetch customer total:', err);
    }

    // 2. Fetch real staff total from backend
    try {
      const staffRes = await userService.listUsers({ page: 1, pageSize: 1, role: 'staff' });
      staffCount = staffRes.total ?? 0;
    } catch (err) {
      console.warn('[Brightloop Dashboard] Could not fetch staff total:', err);
    }

    // 3. Fetch real total users from backend
    try {
      const allUsersRes = await userService.listUsers({ page: 1, pageSize: 1 });
      totalUsers = allUsersRes.total ?? customerCount + staffCount;
    } catch {
      totalUsers = customerCount + staffCount;
    }

    // 4. Probe live analytics/billing endpoints if available
    let analyticsData = null;
    try {
      const res = await apiClient.get('/analytics/dashboard');
      analyticsData = res.data;
    } catch {
      missingEndpoints.push('GET /api/v1/analytics/dashboard (Scheduled for Phase 7)');
    }

    let invoiceSummary = null;
    try {
      const res = await apiClient.get('/invoices/summary');
      invoiceSummary = res.data;
    } catch {
      missingEndpoints.push('GET /api/v1/invoices/summary (Scheduled for Phase 4)');
    }

    let subscriptionSummary = null;
    try {
      const res = await apiClient.get('/subscriptions/summary');
      subscriptionSummary = res.data;
    } catch {
      missingEndpoints.push('GET /api/v1/subscriptions/summary (Scheduled for Phase 4)');
    }

    return {
      customerCount,
      staffCount,
      totalUsers,
      analyticsAvailable: Boolean(analyticsData),
      mrr: analyticsData?.mrr ?? null,
      activeSubscriptions: analyticsData?.active_subscriptions ?? subscriptionSummary?.active_count ?? null,
      collectedRevenue: analyticsData?.total_collections ?? invoiceSummary?.collected_revenue ?? null,
      pendingInvoices: analyticsData?.outstanding_invoices_count ?? invoiceSummary?.pending_count ?? null,
      overdueInvoices: analyticsData?.overdue_invoices_count ?? invoiceSummary?.overdue_count ?? null,
      monthlyRevenueTrend: analyticsData?.revenue_trends ?? null,
      subscriptionDistribution: subscriptionSummary?.distribution ?? null,
      missingEndpoints,
    };
  },

  /**
   * Fetches metrics for the Staff Dashboard.
   * @returns {Promise<{
   *   accessibleCustomers: number,
   *   activeSubscriptions: number|null,
   *   pendingQuotations: number|null,
   *   outstandingInvoices: number|null,
   *   recentPayments: Array<any>|null,
   *   missingEndpoints: string[],
   * }>}
   */
  async getStaffMetrics() {
    const missingEndpoints = [];
    let accessibleCustomers = 0;

    // Staff can view customer profiles per backend permissions in user_service.py
    try {
      const res = await userService.listUsers({ page: 1, pageSize: 1, role: 'customer' });
      accessibleCustomers = res.total ?? 0;
    } catch (err) {
      console.warn('[Brightloop Dashboard] Staff cannot access customer list:', err);
    }

    let operationalData = null;
    try {
      const res = await apiClient.get('/staff/dashboard');
      operationalData = res.data;
    } catch {
      missingEndpoints.push('GET /api/v1/staff/dashboard (Scheduled for Phase 4/5)');
    }

    return {
      accessibleCustomers,
      activeSubscriptions: operationalData?.active_subscriptions ?? null,
      pendingQuotations: operationalData?.pending_quotations ?? null,
      outstandingInvoices: operationalData?.outstanding_invoices ?? null,
      recentPayments: operationalData?.recent_payments ?? null,
      missingEndpoints,
    };
  },

  /**
   * Fetches personalized metrics for the Customer Dashboard.
   * Strictly requests customer's own authenticated records.
   *
   * @returns {Promise<{
   *   activeSubscriptions: number,
   *   upcomingRenewal: string|null,
   *   outstandingAmount: number,
   *   unpaidInvoicesCount: number,
   *   pendingQuotations: number,
   *   recentInvoices: Array<any>,
   *   recentPayments: Array<any>,
   *   activeSubsList: Array<any>,
   *   missingEndpoints: string[],
   * }>}
   */
  async getCustomerMetrics() {
    const missingEndpoints = [];
    let subscriptions = [];
    let quotations = [];
    let invoices = [];
    let payments = [];
    let totalActiveSubscriptions = null;
    let totalPendingQuotations = null;

    // 1. Fetch real customer active subscriptions (with full count metadata)
    try {
      const subRes = await subscriptionService.listSubscriptions({ status: 'active', pageSize: 100 });
      subscriptions = subRes.items || [];
      totalActiveSubscriptions = subRes.total ?? subscriptions.length;
    } catch (err) {
      console.warn('[Brightloop Dashboard] Could not fetch customer subscriptions:', err);
    }

    // 2. Fetch real customer pending quotations (with full count metadata)
    try {
      const quoRes = await quotationService.listQuotations({ status: 'sent', pageSize: 100 });
      quotations = quoRes.items || [];
      totalPendingQuotations = quoRes.total ?? quotations.length;
    } catch (err) {
      console.warn('[Brightloop Dashboard] Could not fetch customer quotations:', err);
    }

    // 3. Fetch all customer invoices across all pages without artificial caps
    try {
      const invResult = await fetchAllPages((p) => invoiceService.listInvoices(p), { pageSize: 100 });
      invoices = invResult.items;
    } catch (err) {
      console.warn('[Brightloop Dashboard] Could not fetch customer invoices:', err);
    }

    // 4. Fetch real customer payments
    try {
      const payRes = await paymentService.listPayments({ pageSize: 5 });
      payments = payRes.items || [];
    } catch (err) {
      console.warn('[Brightloop Dashboard] Could not fetch customer payments:', err);
    }

    const computed = computeCustomerMetrics({
      subscriptions,
      quotations,
      invoices,
      payments,
      totalActiveSubscriptions,
      totalPendingQuotations,
    });

    return {
      ...computed,
      missingEndpoints,
    };
  },
};

export default dashboardService;
