import { apiClient } from './apiClient';
import { userService } from './userService';

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
      activeSubscriptions: subscriptionSummary?.active_count ?? null,
      collectedRevenue: invoiceSummary?.collected_revenue ?? null,
      pendingInvoices: invoiceSummary?.pending_count ?? null,
      overdueInvoices: invoiceSummary?.overdue_count ?? null,
      monthlyRevenueTrend: analyticsData?.monthly_revenue_trend ?? null,
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
   *   activeSubscriptions: number|null,
   *   upcomingRenewal: string|null,
   *   outstandingAmount: number|null,
   *   recentInvoices: Array<any>|null,
   *   recentPayments: Array<any>|null,
   *   missingEndpoints: string[],
   * }>}
   */
  async getCustomerMetrics() {
    const missingEndpoints = [];
    let customerPortalData = null;

    try {
      const res = await apiClient.get('/customer/portal/overview');
      customerPortalData = res.data;
    } catch {
      missingEndpoints.push('GET /api/v1/customer/portal/overview (Scheduled for Phase 11)');
    }

    return {
      activeSubscriptions: customerPortalData?.active_subscriptions ?? null,
      upcomingRenewal: customerPortalData?.upcoming_renewal ?? null,
      outstandingAmount: customerPortalData?.outstanding_amount ?? null,
      recentInvoices: customerPortalData?.recent_invoices ?? null,
      recentPayments: customerPortalData?.recent_payments ?? null,
      missingEndpoints,
    };
  },
};

export default dashboardService;
