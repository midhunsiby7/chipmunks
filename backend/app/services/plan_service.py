import calendar
from datetime import datetime, timedelta, timezone
import logging
import math
from typing import Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.datetime_utils import ensure_utc, utcnow
from app.models.plan import BillingInterval, Plan
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.plan import PlanCreate, PlanResponse, PlanUpdate

logger = logging.getLogger(__name__)


def compute_next_billing_date(
    from_date: datetime,
    interval: BillingInterval,
    interval_count: int = 1,
) -> datetime:
    """
    Deterministically computes the next recurring billing timestamp.
    Handles month-end variations, leap years, and daylight/timezone preservation.
    """
    if interval == BillingInterval.DAILY:
        return from_date + timedelta(days=interval_count)

    elif interval == BillingInterval.WEEKLY:
        return from_date + timedelta(weeks=interval_count)

    elif interval == BillingInterval.MONTHLY:
        total_months = (from_date.month - 1) + interval_count
        target_year = from_date.year + (total_months // 12)
        target_month = (total_months % 12) + 1
        max_days = calendar.monthrange(target_year, target_month)[1]
        target_day = min(from_date.day, max_days)
        return from_date.replace(year=target_year, month=target_month, day=target_day)

    elif interval == BillingInterval.YEARLY:
        target_year = from_date.year + interval_count
        target_month = from_date.month
        # Check leap day February 29
        if target_month == 2 and from_date.day == 29:
            target_day = 29 if calendar.isleap(target_year) else 28
        else:
            target_day = from_date.day
        return from_date.replace(year=target_year, month=target_month, day=target_day)

    raise ValueError(f"Unsupported billing interval: {interval}")


class PlanService:
    @staticmethod
    def _check_manage_permission(current_user: User) -> None:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers are not permitted to manage subscription plans.",
            )

    async def list_plans(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        billing_interval: Optional[BillingInterval] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> PaginatedResponse[PlanResponse]:
        query = select(Plan)

        if is_active is not None:
            query = query.where(Plan.is_active == is_active)

        if billing_interval is not None:
            query = query.where(Plan.billing_interval == billing_interval)

        if search:
            search_pat = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Plan.name.ilike(search_pat),
                    Plan.code.ilike(search_pat),
                    Plan.description.ilike(search_pat),
                )
            )

        total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(Plan.name.asc()).offset(offset).limit(page_size))
        plans = results.scalars().all()

        return PaginatedResponse(
            items=[PlanResponse.model_validate(p) for p in plans],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )

    async def get_plan(self, db: AsyncSession, plan_id: uuid.UUID) -> Plan:
        plan = await db.scalar(select(Plan).where(Plan.id == plan_id))
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription plan not found.",
            )
        return plan

    async def create_plan(
        self,
        db: AsyncSession,
        current_user: User,
        data: PlanCreate,
    ) -> Plan:
        self._check_manage_permission(current_user)

        existing = await db.scalar(select(Plan).where(Plan.code == data.code))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Plan code '{data.code}' already exists.",
            )

        plan = Plan(
            code=data.code,
            name=data.name,
            description=data.description,
            billing_interval=data.billing_interval,
            interval_count=data.interval_count,
            price=data.price,
            currency=data.currency,
            trial_period_days=data.trial_period_days,
            minimum_quantity=data.minimum_quantity,
            available_from=data.available_from,
            available_until=data.available_until,
            product_id=data.product_id,
            is_active=data.is_active,
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        return plan

    async def update_plan(
        self,
        db: AsyncSession,
        current_user: User,
        plan_id: uuid.UUID,
        data: PlanUpdate,
    ) -> Plan:
        self._check_manage_permission(current_user)
        plan = await self.get_plan(db, plan_id)

        if data.code and data.code != plan.code:
            existing = await db.scalar(
                select(Plan).where(Plan.code == data.code, Plan.id != plan_id)
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Plan code '{data.code}' already exists.",
                )
            plan.code = data.code

        for field in (
            "name",
            "description",
            "billing_interval",
            "interval_count",
            "price",
            "currency",
            "trial_period_days",
            "minimum_quantity",
            "available_from",
            "available_until",
            "product_id",
            "is_active",
        ):
            val = getattr(data, field)
            if val is not None:
                setattr(plan, field, val)

        await db.commit()
        await db.refresh(plan)
        return plan

    async def close_plan(
        self,
        db: AsyncSession,
        current_user: User,
        plan_id: uuid.UUID,
    ) -> Plan:
        """Deactivates and sets available_until to now."""
        self._check_manage_permission(current_user)
        plan = await self.get_plan(db, plan_id)
        plan.is_active = False
        plan.available_until = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(plan)
        return plan


plan_service = PlanService()
