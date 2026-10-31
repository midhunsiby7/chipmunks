from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
import math
from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.datetime_utils import ensure_utc, utcnow
from app.models.plan import Plan
from app.models.quotation import Quotation, QuotationStatus
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.subscription import (
    SubscriptionCancelRequest,
    SubscriptionCreate,
    SubscriptionFromQuotationRequest,
    SubscriptionPauseRequest,
    SubscriptionResponse,
    SubscriptionUpdate,
)
from app.services.invoice_service import invoice_service
from app.services.plan_service import compute_next_billing_date, plan_service
from app.services.tax_discount_service import tax_discount_service

logger = logging.getLogger(__name__)


def generate_subscription_code(sequence: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"SUB-{year}-{sequence:05d}"


class SubscriptionService:
    async def list_subscriptions(
        self,
        db: AsyncSession,
        current_user: User,
        page: int = 1,
        page_size: int = 20,
        status_filter: Optional[SubscriptionStatus] = None,
        customer_id: Optional[uuid.UUID] = None,
    ) -> PaginatedResponse[SubscriptionResponse]:
        query = select(Subscription).options(selectinload(Subscription.lines))

        # Enforce Customer Isolation
        if current_user.role == UserRole.CUSTOMER:
            query = query.where(Subscription.customer_id == current_user.id)
        elif customer_id:
            query = query.where(Subscription.customer_id == customer_id)

        if status_filter:
            query = query.where(Subscription.status == status_filter)

        total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(Subscription.created_at.desc()).offset(offset).limit(page_size))
        subs = results.scalars().all()

        return PaginatedResponse(
            items=[SubscriptionResponse.model_validate(s) for s in subs],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )

    async def get_subscription(
        self,
        db: AsyncSession,
        subscription_id: uuid.UUID,
        current_user: User,
    ) -> Subscription:
        query = (
            select(Subscription)
            .options(selectinload(Subscription.lines))
            .where(Subscription.id == subscription_id)
        )
        sub = await db.scalar(query)
        if not sub:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

        # Customer isolation
        if current_user.role == UserRole.CUSTOMER and sub.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        return sub

    async def create_subscription(
        self,
        db: AsyncSession,
        current_user: User,
        data: SubscriptionCreate,
    ) -> Subscription:
        # Authorization check: only Admin, Staff, or Customer creating for themselves
        if current_user.role == UserRole.CUSTOMER and data.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create subscription for another user.")

        plan = await plan_service.get_plan(db, data.plan_id)
        if not plan.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected plan is not active.")

        # Validate minimum quantity
        if data.quantity < plan.minimum_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum quantity for plan '{plan.name}' is {plan.minimum_quantity}.",
            )

        # Validate availability dates
        now = utcnow()
        avail_from = ensure_utc(plan.available_from)
        avail_until = ensure_utc(plan.available_until)
        if avail_from and avail_from > now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan is not yet available.")
        if avail_until and avail_until < now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Plan is no longer available.")

        start_date = data.start_date or now
        next_billing = compute_next_billing_date(start_date, plan.billing_interval, plan.interval_count)

        # Base price calculation
        base_price = (Decimal(str(plan.price)) * data.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        subtotal = base_price

        # Line items
        line_objects = [
            SubscriptionLine(
                description=f"Base Plan: {plan.name}",
                quantity=data.quantity,
                unit_price=Decimal(str(plan.price)),
                line_total=base_price,
            )
        ]

        if data.lines:
            for line in data.lines:
                lt = (Decimal(str(line.unit_price)) * line.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                subtotal += lt
                line_objects.append(
                    SubscriptionLine(
                        product_variant_id=line.product_variant_id,
                        description=line.description,
                        quantity=line.quantity,
                        unit_price=line.unit_price,
                        line_total=lt,
                    )
                )

        # Discount
        discount_amount = Decimal("0.00")
        if data.discount_code:
            valid, disc, msg, disc_obj = await tax_discount_service.validate_and_calculate_discount(
                db=db,
                code=data.discount_code,
                amount=subtotal,
                quantity=data.quantity,
                plan_id=plan.id,
            )
            if valid:
                discount_amount = disc
                if disc_obj:
                    await tax_discount_service.increment_redemption(db, disc_obj.id)

        tax_base = max(Decimal("0.00"), subtotal - discount_amount)

        # Tax
        tax_amount = Decimal("0.00")
        if data.tax_rule_id:
            rule = await tax_discount_service.get_tax_rule(db, data.tax_rule_id)
            tax_amount = tax_discount_service.calculate_tax(tax_base, rule)

        total_amount = tax_base + tax_amount

        count = await db.scalar(select(func.count()).select_from(Subscription)) or 0
        sub_code = generate_subscription_code(count + 1)

        subscription = Subscription(
            subscription_code=sub_code,
            customer_id=data.customer_id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            billing_interval=plan.billing_interval,
            quantity=data.quantity,
            payment_terms=data.payment_terms,
            start_date=start_date,
            next_billing_date=next_billing,
            current_period_start=start_date,
            current_period_end=next_billing,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
            notes=data.notes,
        )
        db.add(subscription)
        await db.flush()

        for l_obj in line_objects:
            l_obj.subscription_id = subscription.id
            db.add(l_obj)

        await db.commit()
        sub = await self.get_subscription(db, subscription.id, current_user)

        # Auto-generate the initial period invoice so it can be paid immediately
        try:
            await invoice_service.generate_invoice_for_subscription(
                db=db,
                subscription=sub,
                period_start=sub.current_period_start,
                period_end=sub.current_period_end,
                auto_commit=True,
            )
        except Exception as exc:
            logger.warning("Could not auto-generate initial invoice for subscription %s: %s", sub.id, exc)

        return sub

    async def convert_quotation(
        self,
        db: AsyncSession,
        current_user: User,
        data: SubscriptionFromQuotationRequest,
    ) -> Subscription:
        # Load quotation
        quote = await db.scalar(
            select(Quotation)
            .options(selectinload(Quotation.lines))
            .where(Quotation.id == data.quotation_id)
        )
        if not quote:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

        if current_user.role == UserRole.CUSTOMER and quote.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        if quote.converted_subscription_id or quote.status == QuotationStatus.CONVERTED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Quotation has already been converted into a subscription.",
            )

        if quote.status != QuotationStatus.ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quotation must be ACCEPTED before conversion. Current: {quote.status.value}",
            )

        # Locate plan from quotation lines or first available plan
        plan_id = None
        for ql in quote.lines:
            if ql.plan_id:
                plan_id = ql.plan_id
                break

        if not plan_id:
            # Fallback to the first active plan
            first_plan = await db.scalar(select(Plan).where(Plan.is_active == True))
            if not first_plan:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active plan found for quotation conversion.")
            plan_id = first_plan.id

        plan = await plan_service.get_plan(db, plan_id)

        now = datetime.now(timezone.utc)
        start_date = data.start_date or now
        next_billing = compute_next_billing_date(start_date, plan.billing_interval, plan.interval_count)

        count = await db.scalar(select(func.count()).select_from(Subscription)) or 0
        sub_code = generate_subscription_code(count + 1)

        subscription = Subscription(
            subscription_code=sub_code,
            customer_id=quote.customer_id,
            plan_id=plan.id,
            status=SubscriptionStatus.ACTIVE,
            billing_interval=plan.billing_interval,
            quantity=1,
            payment_terms="due_on_receipt",
            start_date=start_date,
            next_billing_date=next_billing,
            current_period_start=start_date,
            current_period_end=next_billing,
            subtotal=quote.subtotal,
            tax_amount=quote.tax_amount,
            discount_amount=quote.discount_amount,
            total_amount=quote.total_amount,
            notes=f"Converted from {quote.quotation_number}",
        )
        db.add(subscription)
        await db.flush()

        for ql in quote.lines:
            sub_line = SubscriptionLine(
                subscription_id=subscription.id,
                product_variant_id=ql.product_variant_id,
                description=ql.description,
                quantity=ql.quantity,
                unit_price=ql.unit_price,
                line_total=ql.line_total,
            )
            db.add(sub_line)

        quote.status = QuotationStatus.CONVERTED
        quote.converted_subscription_id = subscription.id
        await db.commit()

        sub = await self.get_subscription(db, subscription.id, current_user)

        # Auto-generate the initial period invoice for converted subscription
        try:
            await invoice_service.generate_invoice_for_subscription(
                db=db,
                subscription=sub,
                period_start=sub.current_period_start,
                period_end=sub.current_period_end,
                auto_commit=True,
            )
        except Exception as exc:
            logger.warning("Could not auto-generate initial invoice for converted quotation %s: %s", quote.id, exc)

        return sub

    async def generate_subscription_invoice(
        self,
        db: AsyncSession,
        subscription_id: uuid.UUID,
        current_user: User,
    ):
        """
        Generates or retrieves the active billing period invoice for a subscription on demand.
        Enforces customer isolation (customers may only generate for their own subscription).
        """
        sub = await self.get_subscription(db, subscription_id, current_user)
        invoice = await invoice_service.generate_invoice_for_subscription(
            db=db,
            subscription=sub,
            period_start=sub.current_period_start,
            period_end=sub.current_period_end,
            auto_commit=True,
        )
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not generate invoice for subscription.",
            )
        return await invoice_service.get_invoice(db, invoice.id, current_user)

    # ------------------ STATE TRANSITIONS ------------------

    async def pause_subscription(
        self,
        db: AsyncSession,
        subscription_id: uuid.UUID,
        current_user: User,
        data: SubscriptionPauseRequest,
    ) -> Subscription:
        sub = await self.get_subscription(db, subscription_id, current_user)
        if sub.status != SubscriptionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only ACTIVE subscriptions can be paused. Current: {sub.status.value}",
            )

        sub.status = SubscriptionStatus.PAUSED
        sub.paused_at = datetime.now(timezone.utc)
        if data.reason:
            sub.notes = (sub.notes or "") + f"\n[Paused]: {data.reason}"
        await db.commit()
        return await self.get_subscription(db, subscription_id, current_user)

    async def resume_subscription(
        self,
        db: AsyncSession,
        subscription_id: uuid.UUID,
        current_user: User,
    ) -> Subscription:
        sub = await self.get_subscription(db, subscription_id, current_user)
        if sub.status != SubscriptionStatus.PAUSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only PAUSED subscriptions can be resumed. Current: {sub.status.value}",
            )

        sub.status = SubscriptionStatus.ACTIVE
        sub.paused_at = None
        await db.commit()
        return await self.get_subscription(db, subscription_id, current_user)

    async def cancel_subscription(
        self,
        db: AsyncSession,
        subscription_id: uuid.UUID,
        current_user: User,
        data: SubscriptionCancelRequest,
    ) -> Subscription:
        sub = await self.get_subscription(db, subscription_id, current_user)
        if sub.status in (SubscriptionStatus.CANCELLED, SubscriptionStatus.CLOSED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subscription is already {sub.status.value}.",
            )

        now = datetime.now(timezone.utc)
        if data.cancel_at_period_end:
            sub.cancel_at_period_end = True
        else:
            sub.status = SubscriptionStatus.CANCELLED
            sub.cancelled_at = now

        if data.reason:
            sub.notes = (sub.notes or "") + f"\n[Cancellation Request]: {data.reason}"
        await db.commit()
        return await self.get_subscription(db, subscription_id, current_user)

    async def close_subscription(
        self,
        db: AsyncSession,
        subscription_id: uuid.UUID,
        current_user: User,
    ) -> Subscription:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        sub = await self.get_subscription(db, subscription_id, current_user)
        sub.status = SubscriptionStatus.CLOSED
        sub.closed_at = datetime.now(timezone.utc)
        await db.commit()
        return await self.get_subscription(db, subscription_id, current_user)


subscription_service = SubscriptionService()
