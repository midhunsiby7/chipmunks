/**
 * Brightloop Centralized Display Formatters
 * Formats currency (INR default), numbers, dates, and status badges.
 */

/**
 * Format amounts into currency representations.
 * Defaults to Indian Rupee (INR - ₹) as required by project specifications.
 *
 * @param {number|string|null|undefined} amount
 * @param {string} [currency='INR']
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount);
  if (amount === null || amount === undefined || isNaN(num)) {
    return '₹0.00';
  }

  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(num);
  } catch {
    // Fallback if environment doesn't recognize currency
    return `₹${num.toFixed(2)}`;
  }
}

/**
 * Format numbers with comma separation.
 * @param {number|string} value
 * @returns {string}
 */
export function formatNumber(value) {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format percentages with optional sign.
 * @param {number} value
 * @param {boolean} [includeSign=true]
 * @returns {string}
 */
export function formatPercentage(value, includeSign = true) {
  const num = Number(value);
  if (isNaN(num)) return '0.0%';
  const prefix = includeSign && num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(1)}%`;
}

/**
 * Format date string into readable date.
 * @param {string|Date} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Format date and time string.
 * @param {string|Date} dateString
 * @returns {string}
 */
export function formatDateTime(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Capitalizes string.
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns role badge configuration.
 * @param {string} role
 * @returns {{ label: string, variant: string, className: string }}
 */
export function getRoleBadgeConfig(role) {
  const norm = String(role || '').toLowerCase();
  switch (norm) {
    case 'admin':
      return {
        label: 'Admin',
        variant: 'primary',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
      };
    case 'staff':
      return {
        label: 'Staff',
        variant: 'info',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      };
    case 'customer':
      return {
        label: 'Customer',
        variant: 'success',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    default:
      return {
        label: capitalize(norm) || 'User',
        variant: 'default',
        className: 'bg-slate-100 text-slate-800 border-slate-200',
      };
  }
}

/**
 * Returns status badge variant for subscription, invoice, or user status.
 * @param {string} status
 * @returns {string} Badge variant name
 */
export function getStatusVariant(status) {
  const norm = String(status || '').toLowerCase();
  switch (norm) {
    case 'active':
    case 'paid':
      return 'success';
    case 'pending':
    case 'trialing':
    case 'draft':
      return 'warning';
    case 'overdue':
    case 'cancelled':
    case 'inactive':
    case 'expired':
    case 'failed':
      return 'danger';
    case 'paused':
      return 'info';
    default:
      return 'default';
  }
}
