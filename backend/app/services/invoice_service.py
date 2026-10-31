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
            else:
                skipped += 1

        await db.commit()

        return RecurringBillingGenerateResponse(
            invoices_generated=len(generated_ids),
            skipped_count=skipped,
            invoice_ids=generated_ids,
            message=f"Recurring billing completed: {len(generated_ids)} generated, {skipped} skipped.",
        )

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
