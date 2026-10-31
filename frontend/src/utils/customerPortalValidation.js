/**
 * Brightloop Customer Portal & Self-Service Validation Utilities
 *
 * Encapsulates client-side customer portal aggregations, role isolation rules,
 * quotation responses, subscription lifecycle bounds, and profile validations.
 */

/**
 * Aggregates real customer metrics without fabricating mock analytics.
 *
 * @param {{
 *   subscriptions?: Array<any>,
 *   quotations?: Array<any>,
 *   invoices?: Array<any>,
 *   payments?: Array<any>,
 * }} params
 * @returns {{
 *   activeSubscriptions: number,
 *   upcomingRenewal: string|null,
 *   outstandingAmount: number,
 *   unpaidInvoicesCount: number,
 *   pendingQuotations: number,
 *   recentInvoices: Array<any>,
 *   recentPayments: Array<any>,
 *   activeSubsList: Array<any>,
 * }}
 */
export function computeCustomerMetrics({
  subscriptions = [],
  quotations = [],
  invoices = [],
  payments = [],
  totalActiveSubscriptions = null,
  totalPendingQuotations = null,
} = {}) {
  const activeSubsList = (subscriptions || []).filter(
    (s) => (s.status || '').toLowerCase() === 'active'
  );
  const activeSubscriptions = totalActiveSubscriptions !== null
    ? totalActiveSubscriptions
    : activeSubsList.length;

  let upcomingRenewal = null;
  if (activeSubsList.length > 0) {
    const sorted = [...activeSubsList].sort((a, b) => {
      const dateA = new Date(a.next_billing_date || a.current_period_end || a.end_date || 0);
      const dateB = new Date(b.next_billing_date || b.current_period_end || b.end_date || 0);
      return dateA - dateB;
    });
    const nextSub = sorted.find((s) => s.next_billing_date || s.current_period_end);
    upcomingRenewal = nextSub?.next_billing_date || nextSub?.current_period_end || null;
  }

  const pendingQuotations = totalPendingQuotations !== null
    ? totalPendingQuotations
    : (quotations || []).filter(
        (q) => (q.status || '').toLowerCase() === 'sent'
      ).length;

  let outstandingAmount = 0;
  let unpaidInvoicesCount = 0;

  (invoices || []).forEach((inv) => {
    const status = (inv.status || '').toLowerCase();
    if (status !== 'paid' && status !== 'cancelled' && status !== 'void') {
      const due = Number(inv.amount_due ?? 0);
      if (due > 0) {
        outstandingAmount += due;
        unpaidInvoicesCount += 1;
      }
    }
  });

  outstandingAmount = Math.round(outstandingAmount * 100) / 100;

  return {
    activeSubscriptions,
    upcomingRenewal,
    outstandingAmount,
    unpaidInvoicesCount,
    pendingQuotations,
    recentInvoices: (invoices || []).slice(0, 5),
    recentPayments: (payments || []).slice(0, 5),
    activeSubsList,
  };
}

/**
 * Checks whether a given path is an administrative route strictly restricted from customers.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isAdministrativeRoute(path) {
  if (!path) return false;
  const adminPrefixes = [
    '/customers',
    '/users',
    '/products',
    '/plans',
    '/taxes',
    '/discounts',
    '/analytics',
    '/settings',
  ];
  const normalized = path.toLowerCase().trim();
  return adminPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

/**
 * Validates customer profile attributes for rendering and completeness.
 *
 * @param {Object} user
 * @returns {{ isComplete: boolean, missingFields: string[] }}
 */
export function validateCustomerProfile(user) {
  if (!user) return { isComplete: false, missingFields: ['user'] };
  const missing = [];
  if (!user.email || !user.email.trim()) missing.push('email');
  if (!user.full_name || !user.full_name.trim()) missing.push('full_name');
  if (!user.phone_number || !user.phone_number.trim()) missing.push('phone_number');
  if (!user.company_name || !user.company_name.trim()) missing.push('company_name');

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}
