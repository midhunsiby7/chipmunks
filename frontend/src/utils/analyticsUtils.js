/**
 * Brightloop Advanced Analytics & Reporting Utilities
 *
 * Implements deterministic date-range boundaries, multi-currency segregation,
 * invoice aging schedules, subscription/payment distributions, and formula-injection-safe CSV exports.
 */

export const DATE_RANGE_OPTIONS = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '7d', label: 'Last 7 Days' },
  { value: 'today', label: 'Today' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

/**
 * Resolves standard date-range boundaries with consistent UTC/local boundaries.
 *
 * @param {string} preset
 * @param {string|Date|null} [customStart=null]
 * @param {string|Date|null} [customEnd=null]
 * @param {Date} [referenceDate=new Date()]
 * @returns {{ startDate: Date|null, endDate: Date|null, label: string }}
 */
export function getDateRangeBoundaries(preset = '30d', customStart = null, customEnd = null, referenceDate = new Date()) {
  const now = new Date(referenceDate);

  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Today' };
    }
    case '7d': {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: now, label: 'Last 7 Days' };
    }
    case '30d': {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start, endDate: now, label: 'Last 30 Days' };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { startDate: start, endDate: now, label: 'This Month' };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate: start, endDate: end, label: 'Last Month' };
    }
    case 'this_quarter': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      return { startDate: start, endDate: now, label: 'This Quarter' };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { startDate: start, endDate: now, label: 'This Year' };
    }
    case 'custom': {
      const start = customStart ? new Date(customStart) : null;
      const end = customEnd ? new Date(customEnd) : null;
      if (end) {
        end.setHours(23, 59, 59, 999);
      }
      return { startDate: start, endDate: end, label: 'Custom Range' };
    }
    case 'all':
    default:
      return { startDate: null, endDate: null, label: 'All Time' };
  }
}

/**
 * Filters a collection of records within date boundaries.
 *
 * @param {Array<any>} records
 * @param {string} dateField
 * @param {Date|null} startDate
 * @param {Date|null} endDate
 * @returns {Array<any>}
 */
export function filterRecordsByDateRange(records = [], dateField = 'created_at', startDate = null, endDate = null) {
  if (!Array.isArray(records)) return [];
  if (!startDate && !endDate) return records;

  const startMs = startDate ? startDate.getTime() : -Infinity;
  const endMs = endDate ? endDate.getTime() : Infinity;

  return records.filter((rec) => {
    const raw = rec[dateField];
    if (!raw) return false;
    const time = new Date(raw).getTime();
    if (isNaN(time)) return false;
    return time >= startMs && time <= endMs;
  });
}

/**
 * Aggregates monetary amounts strictly segregated by currency.
 * Eliminates the risk of summing disparate currencies (e.g., INR + USD).
 *
 * @param {Array<any>} items
 * @param {string} [amountField='total_amount']
 * @param {string} [currencyField='currency']
 * @returns {Record<string, number>} e.g. { INR: 45000, USD: 1200 }
 */
export function groupAmountsByCurrency(items = [], amountField = 'total_amount', currencyField = 'currency') {
  const result = {};
  if (!Array.isArray(items)) return result;

  items.forEach((item) => {
    const curr = (item[currencyField] || 'USD').toUpperCase();
    const val = Number(item[amountField] ?? 0);
    if (!isNaN(val) && val > 0) {
      result[curr] = Math.round(((result[curr] || 0) + val) * 100) / 100;
    }
  });

  return result;
}

/**
 * Calculates a standard 5-tier invoice aging schedule:
 * - Current (Not yet due)
 * - 1-30 Days Past Due
 * - 31-60 Days Past Due
 * - 61-90 Days Past Due
 * - 90+ Days Past Due
 *
 * Only includes unpaid or partially paid active invoices (excludes cancelled and void).
 *
 * @param {Array<any>} invoices
 * @param {Date} [referenceDate=new Date()]
 * @returns {{
 *   totalOverdueCount: number,
 *   buckets: Array<{
 *     id: string,
 *     label: string,
 *     count: number,
 *     byCurrency: Record<string, number>,
 *   }>
 * }}
 */
export function calculateInvoiceAgingSchedule(invoices = [], referenceDate = new Date()) {
  const nowMs = referenceDate.getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const buckets = {
    current: { id: 'current', label: 'Current (Not Due)', count: 0, byCurrency: {} },
    days_1_30: { id: 'days_1_30', label: '1 - 30 Days', count: 0, byCurrency: {} },
    days_31_60: { id: 'days_31_60', label: '31 - 60 Days', count: 0, byCurrency: {} },
    days_61_90: { id: 'days_61_90', label: '61 - 90 Days', count: 0, byCurrency: {} },
    days_90_plus: { id: 'days_90_plus', label: '90+ Days', count: 0, byCurrency: {} },
  };

  let totalOverdueCount = 0;

  if (Array.isArray(invoices)) {
    invoices.forEach((inv) => {
      const status = (inv.status || '').toLowerCase();
      if (['paid', 'cancelled', 'void'].includes(status)) return;

      const due = Number(inv.amount_due ?? 0);
      if (due <= 0) return;

      const curr = (inv.currency || 'USD').toUpperCase();
      const dueDate = inv.due_date ? new Date(inv.due_date).getTime() : null;

      if (!dueDate || dueDate >= nowMs) {
        buckets.current.count += 1;
        buckets.current.byCurrency[curr] = Math.round(((buckets.current.byCurrency[curr] || 0) + due) * 100) / 100;
      } else {
        totalOverdueCount += 1;
        const daysPastDue = Math.floor((nowMs - dueDate) / ONE_DAY_MS);

        let targetKey = 'days_1_30';
        if (daysPastDue > 90) {
          targetKey = 'days_90_plus';
        } else if (daysPastDue > 60) {
          targetKey = 'days_61_90';
        } else if (daysPastDue > 30) {
          targetKey = 'days_31_60';
        }

        buckets[targetKey].count += 1;
        buckets[targetKey].byCurrency[curr] = Math.round(((buckets[targetKey].byCurrency[curr] || 0) + due) * 100) / 100;
      }
    });
  }

  return {
    totalOverdueCount,
    buckets: Object.values(buckets),
  };
}

/**
 * Calculates payment breakdown by payment method and online/offline source.
 *
 * @param {Array<any>} payments
 * @returns {{
 *   totalCompletedVolumeByCurrency: Record<string, number>,
 *   totalCompletedCount: number,
 *   methodBreakdown: Array<{ method: string, count: number, volumeByCurrency: Record<string, number>, isOnline: boolean }>,
 *   onlineCount: number,
 *   offlineCount: number,
 * }}
 */
export function calculatePaymentMethodBreakdown(payments = []) {
  const methodMap = {};
  const totalCompletedVolumeByCurrency = {};
  let totalCompletedCount = 0;
  let onlineCount = 0;
  let offlineCount = 0;

  if (Array.isArray(payments)) {
    payments.forEach((p) => {
      const status = (p.status || '').toLowerCase();
      if (status !== 'completed') return;

      totalCompletedCount += 1;
      const method = (p.payment_method || 'other').toLowerCase();
      const isOnline = method === 'razorpay' || method === 'stripe' || method === 'paypal';
      const curr = (p.currency || 'USD').toUpperCase();
      const amt = Number(p.amount ?? 0);

      if (isOnline) {
        onlineCount += 1;
      } else {
        offlineCount += 1;
      }

      totalCompletedVolumeByCurrency[curr] = Math.round(((totalCompletedVolumeByCurrency[curr] || 0) + amt) * 100) / 100;

      if (!methodMap[method]) {
        methodMap[method] = {
          method,
          count: 0,
          volumeByCurrency: {},
          isOnline,
        };
      }

      methodMap[method].count += 1;
      methodMap[method].volumeByCurrency[curr] = Math.round(((methodMap[method].volumeByCurrency[curr] || 0) + amt) * 100) / 100;
    });
  }

  return {
    totalCompletedVolumeByCurrency,
    totalCompletedCount,
    methodBreakdown: Object.values(methodMap).sort((a, b) => b.count - a.count),
    onlineCount,
    offlineCount,
  };
}

/**
 * Calculates subscription distribution by lifecycle status and billing interval.
 *
 * @param {Array<any>} subscriptions
 * @returns {{
 *   total: number,
 *   byStatus: Record<string, number>,
 *   byCadence: Record<string, number>,
 * }}
 */
export function calculateSubscriptionDistribution(subscriptions = []) {
  const byStatus = {
    active: 0,
    paused: 0,
    closed: 0,
    cancelled: 0,
    trialing: 0,
    draft: 0,
    expired: 0,
  };
  const byCadence = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
  };

  if (Array.isArray(subscriptions)) {
    subscriptions.forEach((s) => {
      const st = (s.status || 'unknown').toLowerCase();
      byStatus[st] = (byStatus[st] || 0) + 1;

      const cad = (s.billing_interval || 'monthly').toLowerCase();
      byCadence[cad] = (byCadence[cad] || 0) + 1;
    });
  }

  return {
    total: subscriptions.length,
    byStatus,
    byCadence,
  };
}

/**
 * Computes plan popularity and revenue contribution.
 *
 * @param {Array<any>} subscriptions
 * @param {Array<any>} [plans=[]]
 * @returns {Array<{ planId: string, planName: string, activeCount: number, mrrContribution: number }>}
 */
export function calculatePlanPopularity(subscriptions = [], plans = []) {
  const planMap = {};

  (plans || []).forEach((p) => {
    planMap[p.id] = {
      planId: p.id,
      planName: p.name,
      activeCount: 0,
      mrrContribution: 0,
    };
  });

  (subscriptions || []).forEach((s) => {
    const planId = s.plan_id || s.plan?.id || 'unknown';
    const planName = s.plan?.name || planMap[planId]?.planName || 'Custom Plan';

    if (!planMap[planId]) {
      planMap[planId] = {
        planId,
        planName,
        activeCount: 0,
        mrrContribution: 0,
      };
    }

    if ((s.status || '').toLowerCase() === 'active') {
      planMap[planId].activeCount += 1;
      const amt = Number(s.total_amount ?? 0);
      const cadence = (s.billing_interval || 'monthly').toLowerCase();
      let mrrWeight = amt;
      if (cadence === 'daily') mrrWeight = amt * 30;
      else if (cadence === 'weekly') mrrWeight = amt * 4.333;
      else if (cadence === 'yearly') mrrWeight = amt / 12;

      planMap[planId].mrrContribution = Math.round((planMap[planId].mrrContribution + mrrWeight) * 100) / 100;
    }
  });

  return Object.values(planMap)
    .filter((item) => item.activeCount > 0 || plans.some((p) => p.id === item.planId))
    .sort((a, b) => b.activeCount - a.activeCount);
}

// -------------------------------------------------------------
// CSV EXPORT ENGINE & FORMULA INJECTION DEFENSE
// -------------------------------------------------------------

/**
 * Sanitizes a single cell value to prevent CSV Formula Injection (CWE-1236).
 * Prepends a single quote (') if the string begins with =, +, -, @, \t, or \r.
 * Encloses the cell in double quotes if it contains commas, quotes, or newlines.
 *
 * @param {any} val
 * @returns {string}
 */
export function sanitizeCsvValue(val) {
  if (val === null || val === undefined) return '';

  let str = String(val);

  // Formula Injection Guard: check for leading trigger characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180 Escaping: wrap in quotes if containing comma, newline, or double quote
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Builds an RFC 4180 compliant CSV string from an array of headers and row objects/arrays.
 *
 * @param {Array<string>} headers
 * @param {Array<Array<any>>} rows
 * @returns {string}
 */
export function generateCsvContent(headers = [], rows = []) {
  const headerLine = headers.map(sanitizeCsvValue).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvValue).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Triggers a client-side download of a generated CSV file.
 *
 * @param {string} filename e.g. "brightloop_invoices_report.csv"
 * @param {string} csvContent
 */
export function downloadCsvFile(filename, csvContent) {
  if (typeof window === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
