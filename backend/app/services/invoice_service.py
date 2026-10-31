from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
import math
from typing import List, Optional, Tuple
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    RecurringBillingGenerateRequest,
    RecurringBillingGenerateResponse,
)
from app.services.plan_service import compute_next_billing_date
from app.services.tax_discount_service import tax_discount_service

logger = logging.getLogger(__name__)


def generate_invoice_number(sequence: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"INV-{year}-{sequence:05d}"


class InvoiceService:
    async def list_invoices(
        self,
        db: AsyncSession,
        current_user: User,
        page: int = 1,
        page_size: int = 20,
        status_filter: Optional[InvoiceStatus] = None,
        customer_id: Optional[uuid.UUID] = None,
        subscription_id: Optional[uuid.UUID] = None,
    ) -> PaginatedResponse[InvoiceResponse]:
        query = select(Invoice).options(selectinload(Invoice.lines))

        # Enforce Customer Isolation
        if current_user.role == UserRole.CUSTOMER:
            query = query.where(Invoice.customer_id == current_user.id)
        elif customer_id:
            query = query.where(Invoice.customer_id == customer_id)

        if subscription_id:
            query = query.where(Invoice.subscription_id == subscription_id)

        if status_filter:
            query = query.where(Invoice.status == status_filter)

        total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(Invoice.created_at.desc()).offset(offset).limit(page_size))
        invoices = results.scalars().all()

        return PaginatedResponse(
            items=[InvoiceResponse.model_validate(inv) for inv in invoices],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )

    async def get_invoice(
        self,
        db: AsyncSession,
        invoice_id: uuid.UUID,
        current_user: User,
    ) -> Invoice:
        query = (
            select(Invoice)
            .options(selectinload(Invoice.lines), selectinload(Invoice.payments))
            .where(Invoice.id == invoice_id)
        )
        invoice = await db.scalar(query)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

        # Customer isolation
        if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        return invoice

    async def create_invoice(
        self,
        db: AsyncSession,
        current_user: User,
        data: InvoiceCreate,
    ) -> Invoice:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        count = await db.scalar(select(func.count()).select_from(Invoice)) or 0
        inv_number = generate_invoice_number(count + 1)

        subtotal = Decimal("0.00")
        line_objects = []
        for line in data.lines:
            lt = (Decimal(str(line.unit_price)) * line.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            subtotal += lt
            line_objects.append(
                InvoiceLine(
                    description=line.description,
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    line_total=lt,
                )
            )

        # Discount
        discount_amount = Decimal("0.00")
        if data.discount_code:
            valid, disc, _, _ = await tax_discount_service.validate_and_calculate_discount(
                db=db, code=data.discount_code, amount=subtotal
            )
            if valid:
                discount_amount = disc

        tax_base = max(Decimal("0.00"), subtotal - discount_amount)

        # Tax
        tax_amount = Decimal("0.00")
        if data.tax_rule_id:
            rule = await tax_discount_service.get_tax_rule(db, data.tax_rule_id)
            tax_amount = tax_discount_service.calculate_tax(tax_base, rule)

        total_amount = tax_base + tax_amount
        now = datetime.now(timezone.utc)

        invoice = Invoice(
            invoice_number=inv_number,
            customer_id=data.customer_id,
            subscription_id=data.subscription_id,
            status=InvoiceStatus.CONFIRMED,
            issue_date=now,
            due_date=data.due_date,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
            amount_paid=Decimal("0.00"),
            amount_due=total_amount,
            currency=data.currency,
            notes=data.notes,
        )
        db.add(invoice)
        await db.flush()

        for l_obj in line_objects:
            l_obj.invoice_id = invoice.id
            db.add(l_obj)

        await db.commit()
        return await self.get_invoice(db, invoice.id, current_user)

    async def generate_invoice_for_subscription(
        self,
        db: AsyncSession,
        subscription: Subscription,
        period_start: datetime,
        period_end: datetime,
        auto_commit: bool = True,
    ) -> Optional[Invoice]:
        """
        Idempotently generates an invoice for a specific subscription billing period.
        Guarantees that duplicate invoices are never generated for the same period.
        """
        # Check if invoice already exists for this exact subscription period
        existing = await db.scalar(
            select(Invoice).where(
                Invoice.subscription_id == subscription.id,
                Invoice.billing_period_start == period_start,
                Invoice.billing_period_end == period_end,
            )
        )
        if existing:
            logger.info("Invoice already exists for subscription %s period %s -> %s", subscription.id, period_start, period_end)
            return existing

        count = await db.scalar(select(func.count()).select_from(Invoice)) or 0
        inv_number = generate_invoice_number(count + 1)

        due_date = period_start + timedelta(days=14)

        invoice = Invoice(
            invoice_number=inv_number,
            customer_id=subscription.customer_id,
            subscription_id=subscription.id,
            status=InvoiceStatus.CONFIRMED,
            billing_period_start=period_start,
            billing_period_end=period_end,
            issue_date=datetime.now(timezone.utc),
            due_date=due_date,
            subtotal=subscription.subtotal,
            tax_amount=subscription.tax_amount,
            discount_amount=subscription.discount_amount,
            total_amount=subscription.total_amount,
            amount_paid=Decimal("0.00"),
            amount_due=subscription.total_amount,
            currency="USD",
            notes=f"Recurring billing for {subscription.subscription_code} ({period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')})",
        )
        db.add(invoice)

        try:
            await db.flush()
        except IntegrityError:
            # Concurrent race caught by uq_invoice_sub_period
            await db.rollback()
            return await db.scalar(
                select(Invoice).where(
                    Invoice.subscription_id == subscription.id,
                    Invoice.billing_period_start == period_start,
                    Invoice.billing_period_end == period_end,
                )
            )

        # Copy line items
        for sl in subscription.lines:
            inv_line = InvoiceLine(
                invoice_id=invoice.id,
                description=sl.description,
                quantity=sl.quantity,
                unit_price=sl.unit_price,
                line_total=sl.line_total,
            )
            db.add(inv_line)

        if auto_commit:
            await db.commit()
            await db.refresh(invoice)

        return invoice

    async def generate_recurring_invoices(
        self,
        db: AsyncSession,
        current_user: User,
        data: RecurringBillingGenerateRequest,
    ) -> RecurringBillingGenerateResponse:
        """
        Admin-only recurring billing engine. Scans active subscriptions due for billing
        and generates invoices idempotently.
        """
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        target_date = data.target_date or datetime.now(timezone.utc)

        # Find ACTIVE subscriptions where next_billing_date <= target_date
        # Exclude PAUSED, CLOSED, and CANCELLED subscriptions
        query = (
            select(Subscription)
            .options(selectinload(Subscription.lines))
            .where(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.next_billing_date <= target_date,
            )
        )
        due_subs = (await db.execute(query)).scalars().all()

        generated_ids: List[uuid.UUID] = []
        skipped = 0

        for sub in due_subs:
            # Check expiry
            if sub.expiry_date and sub.next_billing_date > sub.expiry_date:
                sub.status = SubscriptionStatus.EXPIRED
                continue

            max_consecutive_periods = 36
            period_count = 0
            while sub.next_billing_date <= target_date and period_count < max_consecutive_periods:
                period_count += 1
                period_start = sub.current_period_end
                period_end = compute_next_billing_date(period_start, sub.billing_interval)

                inv = await self.generate_invoice_for_subscription(
                    db=db,
                    subscription=sub,
                    period_start=period_start,
                    period_end=period_end,
                    auto_commit=False,
                )

                if inv and inv.id not in generated_ids:
                    generated_ids.append(inv.id)
                    # Advance subscription periods
                    sub.current_period_start = period_start
                    sub.current_period_end = period_end
                    sub.next_billing_date = period_end

                    # Check if cancellation was scheduled at period end
                    if sub.cancel_at_period_end:
                        sub.status = SubscriptionStatus.CANCELLED
                        sub.cancelled_at = datetime.now(timezone.utc)
                        break
                else:
                    skipped += 1
                    # Even if invoice already existed for this period, advance pointer to next period
                    sub.current_period_start = period_start
                    sub.current_period_end = period_end
                    sub.next_billing_date = period_end

        await db.commit()

        return RecurringBillingGenerateResponse(
            invoices_generated=len(generated_ids),
            skipped_count=skipped,
            invoice_ids=generated_ids,
            message=f"Recurring billing completed: {len(generated_ids)} generated, {skipped} skipped.",
        )

    async def update_overdue_invoices(self, db: AsyncSession) -> int:
        """
        Scans confirmed/issued/partially-paid invoices past their due date and
        transitions them to OVERDUE.
        """
        now = datetime.now(timezone.utc)
        query = select(Invoice).where(
            Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID]),
            Invoice.due_date < now,
            Invoice.amount_due > 0,
        )
        invoices = (await db.execute(query)).scalars().all()
        updated = 0
        for inv in invoices:
            inv.status = InvoiceStatus.OVERDUE
            updated += 1
        if updated > 0:
            await db.commit()
            logger.info("Marked %d past-due invoices as OVERDUE", updated)
        return updated

    async def get_invoice_html(
        self,
        db: AsyncSession,
        invoice_id: uuid.UUID,
        current_user: User,
    ) -> str:
        """
        Renders an elegant, printable HTML invoice with CSS print styling.
        """
        query = (
            select(Invoice)
            .options(
                selectinload(Invoice.lines),
                selectinload(Invoice.customer),
                selectinload(Invoice.subscription),
            )
            .where(Invoice.id == invoice_id)
        )
        invoice = await db.scalar(query)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

        # Customer isolation
        if current_user.role == UserRole.CUSTOMER and invoice.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        customer_name = invoice.customer.full_name if invoice.customer else "Valued Customer"
        customer_email = invoice.customer.email if invoice.customer else ""
        company_name = (invoice.customer.company_name or "") if invoice.customer else ""

        status_colors = {
            "paid": "#16a34a",
            "confirmed": "#2563eb",
            "issued": "#2563eb",
            "partially_paid": "#ca8a04",
            "overdue": "#dc2626",
            "cancelled": "#6b7280",
            "void": "#6b7280",
            "draft": "#9ca3af",
        }
        badge_color = status_colors.get(invoice.status.value, "#2563eb")

        period_info = ""
        if invoice.billing_period_start and invoice.billing_period_end:
            period_info = f"""
            <div class="meta-row">
                <span class="meta-label">Billing Period:</span>
                <span class="meta-value">{invoice.billing_period_start.strftime('%b %d, %Y')} – {invoice.billing_period_end.strftime('%b %d, %Y')}</span>
            </div>
            """

        lines_rows = ""
        for line in invoice.lines:
            lines_rows += f"""
            <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">{line.description}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">{line.quantity}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">${line.unit_price:.2f}</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${line.line_total:.2f}</td>
            </tr>
            """

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {invoice.invoice_number} – Brightloop</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            background-color: #f9fafb;
            margin: 0;
            padding: 32px 16px;
        }}
        .invoice-card {{
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            padding: 40px;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f3f4f6;
            padding-bottom: 24px;
            margin-bottom: 24px;
        }}
        .brand {{
            font-size: 24px;
            font-weight: 800;
            color: #2563eb;
            letter-spacing: -0.5px;
        }}
        .brand-sub {{
            font-size: 13px;
            color: #6b7280;
            margin-top: 4px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #ffffff;
            background-color: {badge_color};
        }}
        .parties {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
        }}
        .section-title {{
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #9ca3af;
            margin-bottom: 8px;
        }}
        .party-name {{
            font-size: 16px;
            font-weight: 700;
            color: #111827;
        }}
        .party-detail {{
            font-size: 14px;
            color: #4b5563;
            margin-top: 2px;
        }}
        .meta-row {{
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            padding: 4px 0;
        }}
        .meta-label {{
            color: #6b7280;
        }}
        .meta-value {{
            font-weight: 600;
            color: #111827;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }}
        th {{
            background-color: #f9fafb;
            padding: 12px 16px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            border-bottom: 2px solid #e5e7eb;
        }}
        .totals-container {{
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
        }}
        .totals-table {{
            width: 320px;
        }}
        .total-row {{
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 14px;
            color: #4b5563;
        }}
        .total-row.grand {{
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            border-top: 2px solid #e5e7eb;
            padding-top: 10px;
            margin-top: 6px;
        }}
        .total-row.due {{
            font-size: 16px;
            font-weight: 800;
            color: #dc2626;
            border-top: 1px solid #fee2e2;
            padding-top: 8px;
            margin-top: 4px;
        }}
        .notes-box {{
            margin-top: 32px;
            padding: 16px;
            border-radius: 8px;
            background-color: #f9fafb;
            font-size: 13px;
            color: #6b7280;
        }}
        .action-bar {{
            max-width: 800px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }}
        .btn {{
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            background-color: #2563eb;
            color: #ffffff;
            font-size: 14px;
            font-weight: 600;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            text-decoration: none;
        }}
        .btn:hover {{
            background-color: #1d4ed8;
        }}
        @media print {{
            body {{
                background-color: #ffffff;
                padding: 0;
            }}
            .invoice-card {{
                box-shadow: none;
                padding: 0;
            }}
            .no-print {{
                display: none !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="action-bar no-print">
        <button class="btn" onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="invoice-card">
        <div class="header">
            <div>
                <div class="brand">Brightloop</div>
                <div class="brand-sub">Subscription Management System</div>
            </div>
            <div style="text-align: right;">
                <span class="badge">{invoice.status.value}</span>
                <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 800;">{invoice.invoice_number}</h2>
            </div>
        </div>

        <div class="parties">
            <div>
                <div class="section-title">Billed To</div>
                <div class="party-name">{customer_name}</div>
                {f'<div class="party-detail">{company_name}</div>' if company_name else ''}
                {f'<div class="party-detail">{customer_email}</div>' if customer_email else ''}
            </div>
            <div>
                <div class="section-title">Invoice Details</div>
                <div class="meta-row">
                    <span class="meta-label">Issue Date:</span>
                    <span class="meta-value">{invoice.issue_date.strftime('%b %d, %Y')}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Due Date:</span>
                    <span class="meta-value">{invoice.due_date.strftime('%b %d, %Y')}</span>
                </div>
                {period_info}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="text-align: left;">Description</th>
                    <th style="text-align: center; width: 80px;">Qty</th>
                    <th style="text-align: right; width: 120px;">Unit Price</th>
                    <th style="text-align: right; width: 120px;">Total</th>
                </tr>
            </thead>
            <tbody>
                {lines_rows}
            </tbody>
        </table>

        <div class="totals-container">
            <div class="totals-table">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>${invoice.subtotal:.2f}</span>
                </div>
                {f'<div class="total-row"><span>Discount:</span><span>-${invoice.discount_amount:.2f}</span></div>' if invoice.discount_amount > 0 else ''}
                {f'<div class="total-row"><span>Tax:</span><span>+${invoice.tax_amount:.2f}</span></div>' if invoice.tax_amount > 0 else ''}
                <div class="total-row grand">
                    <span>Total Amount:</span>
                    <span>${invoice.total_amount:.2f}</span>
                </div>
                <div class="total-row">
                    <span>Amount Paid:</span>
                    <span>${invoice.amount_paid:.2f}</span>
                </div>
                <div class="total-row due">
                    <span>Amount Due:</span>
                    <span>${invoice.amount_due:.2f} {invoice.currency}</span>
                </div>
            </div>
        </div>

        {f'<div class="notes-box"><strong>Notes:</strong> {invoice.notes}</div>' if invoice.notes else ''}
    </div>
</body>
</html>"""
        return html


    async def cancel_invoice(
        self,
        db: AsyncSession,
        invoice_id: uuid.UUID,
        current_user: User,
    ) -> Invoice:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        invoice = await self.get_invoice(db, invoice_id, current_user)
        if invoice.amount_paid > Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoices with recorded payments cannot be cancelled. Refund payments first.",
            )

        invoice.status = InvoiceStatus.CANCELLED
        await db.commit()
        return await self.get_invoice(db, invoice_id, current_user)


invoice_service = InvoiceService()
