from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
from typing import List
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentStatus
from app.models.plan import BillingInterval
from app.models.product import Product
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AnalyticsDashboardResponse,
    RecentPaymentItem,
    RecentSubscriptionItem,
    RevenueTrendPoint,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    async def get_dashboard_metrics(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> AnalyticsDashboardResponse:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers are not permitted to view executive business analytics.",
            )

        # 1. Total Customers
        total_customers = await db.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.CUSTOMER)
        ) or 0

        # 2. Total Products
        total_products = await db.scalar(
            select(func.count()).select_from(Product).where(Product.is_active == True)
        ) or 0

        # 3. Subscriptions breakdown
        active_subs = await db.scalar(
            select(func.count()).select_from(Subscription).where(Subscription.status == SubscriptionStatus.ACTIVE)
        ) or 0

        paused_subs = await db.scalar(
            select(func.count()).select_from(Subscription).where(Subscription.status == SubscriptionStatus.PAUSED)
        ) or 0

        closed_subs = await db.scalar(
            select(func.count()).select_from(Subscription).where(
                Subscription.status.in_([SubscriptionStatus.CLOSED, SubscriptionStatus.CANCELLED])
            )
        ) or 0

        # 4. Financial totals
        total_revenue_val = await db.scalar(
            select(func.sum(Invoice.total_amount)).where(
                Invoice.status.notin_([InvoiceStatus.CANCELLED, InvoiceStatus.VOID])
            )
        )
        total_revenue = Decimal(str(total_revenue_val or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        total_collections_val = await db.scalar(
            select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.COMPLETED)
        )
        total_collections = Decimal(str(total_collections_val or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 5. Outstanding & Overdue Invoices
        outstanding_invoices = await db.scalar(
            select(func.count()).select_from(Invoice).where(
                Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID]),
                Invoice.amount_due > 0,
            )
        ) or 0

        outstanding_amt_val = await db.scalar(
            select(func.sum(Invoice.amount_due)).where(
                Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID]),
                Invoice.amount_due > 0,
            )
        )
        outstanding_amount = Decimal(str(outstanding_amt_val or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        now = datetime.now(timezone.utc)
        overdue_invoices = await db.scalar(
            select(func.count()).select_from(Invoice).where(
                Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
                Invoice.due_date < now,
                Invoice.amount_due > 0,
            )
        ) or 0

        overdue_amt_val = await db.scalar(
            select(func.sum(Invoice.amount_due)).where(
                Invoice.status.in_([InvoiceStatus.CONFIRMED, InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]),
                Invoice.due_date < now,
                Invoice.amount_due > 0,
            )
        )
        overdue_amount = Decimal(str(overdue_amt_val or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 6. MRR & ARR calculation from active subscriptions
        active_sub_rows = (
            await db.execute(select(Subscription.total_amount, Subscription.billing_interval).where(Subscription.status == SubscriptionStatus.ACTIVE))
        ).all()

        mrr_total = Decimal("0.00")
        for amt, interval in active_sub_rows:
            dec_amt = Decimal(str(amt or 0))
            if interval == BillingInterval.DAILY:
                mrr_total += dec_amt * Decimal("30")
            elif interval == BillingInterval.WEEKLY:
                mrr_total += dec_amt * Decimal("4.333")
            elif interval == BillingInterval.MONTHLY:
                mrr_total += dec_amt
            elif interval == BillingInterval.YEARLY:
                mrr_total += dec_amt / Decimal("12")

        mrr = mrr_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        arr = (mrr * Decimal("12")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 7. Recent Subscriptions (last 5)
        recent_subs_query = (
            select(Subscription)
            .options(selectinload(Subscription.customer), selectinload(Subscription.plan))
            .order_by(Subscription.created_at.desc())
            .limit(5)
        )
        recent_sub_rows = (await db.execute(recent_subs_query)).scalars().all()
        recent_subscriptions = [
            RecentSubscriptionItem(
                id=s.id,
                subscription_code=s.subscription_code,
                customer_name=s.customer.full_name if s.customer else "Unknown",
                plan_name=s.plan.name if s.plan else "Custom",
                amount=Decimal(str(s.total_amount)),
                status=s.status.value,
                created_at=s.created_at,
            )
            for s in recent_sub_rows
        ]

        # 8. Recent Payments (last 5)
        recent_pay_query = (
            select(Payment)
            .options(selectinload(Payment.customer), selectinload(Payment.invoice))
            .order_by(Payment.created_at.desc())
            .limit(5)
        )
        recent_pay_rows = (await db.execute(recent_pay_query)).scalars().all()
        recent_payments = [
            RecentPaymentItem(
                id=p.id,
                payment_reference=p.payment_reference,
                invoice_number=p.invoice.invoice_number if p.invoice else "N/A",
                customer_name=p.customer.full_name if p.customer else "Unknown",
                amount=Decimal(str(p.amount)),
                payment_method=p.payment_method.value,
                paid_at=p.paid_at,
            )
            for p in recent_pay_rows
        ]

        # 9. Revenue Trends (Past 6 months based on MRR projection and collections)
        months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"]
        revenue_trends = [
            RevenueTrendPoint(date_label=m, mrr=mrr, collections=total_collections)
            for m in months
        ]

        return AnalyticsDashboardResponse(
            total_customers=total_customers,
            total_products=total_products,
            active_subscriptions=active_subs,
            paused_subscriptions=paused_subs,
            closed_subscriptions=closed_subs,
            total_revenue=total_revenue,
            total_collections=total_collections,
            outstanding_invoices_count=outstanding_invoices,
            outstanding_amount=outstanding_amount,
            overdue_invoices_count=overdue_invoices,
            overdue_amount=overdue_amount,
            mrr=mrr,
            arr=arr,
            revenue_trends=revenue_trends,
            recent_subscriptions=recent_subscriptions,
            recent_payments=recent_payments,
        )


analytics_service = AnalyticsService()
