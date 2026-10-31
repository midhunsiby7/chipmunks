/**
 * Validation utilities and business rules for Brightloop Invoice Management.
 * Conforms to backend app.models.invoice and app.schemas.invoice.
 */

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  ISSUED: 'issued',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  VOID: 'void',
};

/**
 * Returns visual status badge metadata for invoice statuses.
 *
 * @param {string} status
 * @returns {{ variant: string, label: string, dot: boolean, color: string }}
 */
export function getInvoiceStatusBadge(status) {
  const norm = (status || '').toLowerCase();
  switch (norm) {
    case INVOICE_STATUSES.PAID:
      return { variant: 'success', label: 'Paid', dot: true, color: 'emerald' };
    case INVOICE_STATUSES.CONFIRMED:
      return { variant: 'primary', label: 'Confirmed', dot: true, color: 'blue' };
    case INVOICE_STATUSES.ISSUED:
      return { variant: 'indigo', label: 'Issued', dot: true, color: 'indigo' };
    case INVOICE_STATUSES.PARTIALLY_PAID:
      return { variant: 'warning', label: 'Partially Paid', dot: true, color: 'amber' };
    case INVOICE_STATUSES.OVERDUE:
      return { variant: 'danger', label: 'Overdue', dot: true, color: 'red' };
    case INVOICE_STATUSES.CANCELLED:
      return { variant: 'default', label: 'Cancelled', dot: false, color: 'slate' };
    case INVOICE_STATUSES.VOID:
      return { variant: 'default', label: 'Void', dot: false, color: 'slate' };
    case INVOICE_STATUSES.DRAFT:
      return { variant: 'default', label: 'Draft', dot: false, color: 'slate' };
    default:
      return { variant: 'default', label: status || 'Unknown', dot: false, color: 'slate' };
  }
}

/**
 * Pure evaluation of whether an invoice has passed its due date with an outstanding balance.
 *
 * @param {string|Date|null} dueDate
 * @param {number|string} amountDue
 * @returns {boolean}
 */
export function isInvoiceOverdue(dueDate, amountDue) {
  if (!dueDate) return false;
  const isPastDue = new Date(dueDate).getTime() < Date.now();
  const hasBalance = Number(amountDue) > 0;
  return isPastDue && hasBalance;
}

/**
 * Checks whether an invoice is eligible for cancellation by an Admin or Staff member.
 * Invoices with recorded payments (amount_paid > 0) cannot be cancelled per backend rules.
 *
 * @param {Object} invoice
 * @param {string} userRole
 * @returns {boolean}
 */
export function canCancelInvoice(invoice, userRole) {
  if (!userRole || !invoice) return false;
  const normRole = userRole.toLowerCase();
  const isAdminOrStaff = normRole === 'admin' || normRole === 'staff';
  if (!isAdminOrStaff) return false;

  const hasPaid = Number(invoice.amount_paid || 0) > 0;
  const isCancelled = invoice.status === INVOICE_STATUSES.CANCELLED;
  return !hasPaid && !isCancelled;
}

/**
 * Validates manual invoice creation payload before sending to backend.
 *
 * @param {Object} data
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateInvoicePayload(data) {
  const errors = {};

  if (!data.customer_id || typeof data.customer_id !== 'string' || !data.customer_id.trim()) {
    errors.customer_id = 'Customer selection is required.';
  }

  if (!data.due_date) {
    errors.due_date = 'Invoice due date is required.';
  } else {
    const d = new Date(data.due_date);
    if (isNaN(d.getTime())) {
      errors.due_date = 'Invalid invoice due date.';
    }
  }

  if (!Array.isArray(data.lines) || data.lines.length === 0) {
    errors.lines = 'Invoice must contain at least one itemized line.';
  } else {
    data.lines.forEach((line, idx) => {
      if (!line.description || !line.description.trim()) {
        errors[`line_${idx}_description`] = `Line ${idx + 1}: Description is required.`;
      }
      const qty = Number(line.quantity);
      if (isNaN(qty) || qty < 1 || !Number.isInteger(qty)) {
        errors[`line_${idx}_quantity`] = `Line ${idx + 1}: Quantity must be an integer of at least 1.`;
      }
      const price = Number(line.unit_price);
      if (isNaN(price) || price < 0) {
        errors[`line_${idx}_price`] = `Line ${idx + 1}: Unit price must be non-negative.`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Client-side calculation to preview estimated invoice financials before server submission.
 *
 * @param {Array<Object>} [lines=[]]
 * @param {number|string} [discountDeduction=0]
 * @param {Object|null} [taxRule=null]
 * @returns {{
 *   subtotal: number,
 *   discountAmount: number,
 *   taxBase: number,
 *   taxAmount: number,
 *   totalAmount: number
 * }}
 */
export function calculateEstimatedInvoiceTotals(lines = [], discountDeduction = 0, taxRule = null) {
  let subtotal = 0;
  if (Array.isArray(lines)) {
    lines.forEach((l) => {
      const q = Number(l.quantity) || 0;
      const p = Number(l.unit_price) || 0;
      subtotal += Math.round(q * p * 100) / 100;
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const discountAmount = Math.min(subtotal, Math.max(0, Number(discountDeduction) || 0));
  const taxBase = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  let taxAmount = 0;
  if (taxRule) {
    const rate = Number(taxRule.rate_percentage) || 0;
    if (taxRule.is_fixed) {
      taxAmount = rate;
    } else {
      taxAmount = Math.round(taxBase * (rate / 100) * 100) / 100;
    }
  }

  const totalAmount = Math.round((taxBase + taxAmount) * 100) / 100;

  return {
    subtotal,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxBase,
    taxAmount,
    totalAmount,
  };
}
