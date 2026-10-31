from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import logging
import math
from typing import Optional, Tuple
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.datetime_utils import ensure_utc, utcnow
from app.models.discount import Discount, DiscountType
from app.models.tax import TaxRule
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.discount import (
    DiscountCreate,
    DiscountResponse,
    DiscountUpdate,
    DiscountValidateRequest,
    DiscountValidateResponse,
)
from app.schemas.tax import TaxRuleCreate, TaxRuleResponse, TaxRuleUpdate

logger = logging.getLogger(__name__)


class TaxDiscountService:
    @staticmethod
    def _check_manage_permission(current_user: User) -> None:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers are not permitted to manage tax rules or promotional discounts.",
            )

    # ------------------ TAX RULES ------------------

    async def list_tax_rules(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        country_code: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> PaginatedResponse[TaxRuleResponse]:
        query = select(TaxRule)
        if is_active is not None:
            query = query.where(TaxRule.is_active == is_active)
        if country_code:
            query = query.where(TaxRule.country_code == country_code.upper())

        total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(TaxRule.name.asc()).offset(offset).limit(page_size))
        rules = results.scalars().all()

        return PaginatedResponse(
            items=[TaxRuleResponse.model_validate(r) for r in rules],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )

    async def get_tax_rule(self, db: AsyncSession, rule_id: uuid.UUID) -> TaxRule:
        rule = await db.scalar(select(TaxRule).where(TaxRule.id == rule_id))
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax rule not found.",
            )
        return rule

    async def create_tax_rule(
        self,
        db: AsyncSession,
        current_user: User,
        data: TaxRuleCreate,
    ) -> TaxRule:
        self._check_manage_permission(current_user)

        existing = await db.scalar(select(TaxRule).where(TaxRule.tax_code == data.tax_code))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tax rule with code '{data.tax_code}' already exists.",
            )

        rule = TaxRule(
            name=data.name,
            tax_code=data.tax_code,
            rate_percentage=data.rate_percentage,
            is_fixed=data.is_fixed,
            country_code=data.country_code.upper(),
            state_or_region=data.state_or_region,
            effective_from=data.effective_from,
            effective_until=data.effective_until,
            is_active=data.is_active,
        )
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    async def update_tax_rule(
        self,
        db: AsyncSession,
        current_user: User,
        rule_id: uuid.UUID,
        data: TaxRuleUpdate,
    ) -> TaxRule:
        self._check_manage_permission(current_user)
        rule = await self.get_tax_rule(db, rule_id)

        if data.tax_code and data.tax_code != rule.tax_code:
            existing = await db.scalar(
                select(TaxRule).where(TaxRule.tax_code == data.tax_code, TaxRule.id != rule_id)
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Tax rule with code '{data.tax_code}' already exists.",
                )
            rule.tax_code = data.tax_code

        for field in ("name", "rate_percentage", "is_fixed", "country_code", "state_or_region", "effective_from", "effective_until", "is_active"):
            val = getattr(data, field)
            if val is not None:
                if field == "country_code":
                    setattr(rule, field, val.upper())
                else:
                    setattr(rule, field, val)

        await db.commit()
        await db.refresh(rule)
        return rule

    def calculate_tax(self, base_amount: Decimal, rule: Optional[TaxRule]) -> Decimal:
        if not rule or not rule.is_active:
            return Decimal("0.00")

        now = utcnow()
        eff_from = ensure_utc(rule.effective_from)
        eff_until = ensure_utc(rule.effective_until)
        if eff_from and eff_from > now:
            return Decimal("0.00")
        if eff_until and eff_until < now:
            return Decimal("0.00")

        if rule.is_fixed:
            return Decimal(str(rule.rate_percentage)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Percentage
        rate = Decimal(str(rule.rate_percentage)) / Decimal("100")
        return (base_amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # ------------------ DISCOUNTS ------------------

    async def list_discounts(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> PaginatedResponse[DiscountResponse]:
        query = select(Discount)
        if is_active is not None:
            query = query.where(Discount.is_active == is_active)
        if search:
            search_pat = f"%{search.strip()}%"
            query = query.where(or_(Discount.code.ilike(search_pat), Discount.description.ilike(search_pat)))

        total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(Discount.created_at.desc()).offset(offset).limit(page_size))
        discounts = results.scalars().all()

        return PaginatedResponse(
            items=[DiscountResponse.model_validate(d) for d in discounts],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )

    async def get_discount(self, db: AsyncSession, discount_id: uuid.UUID) -> Discount:
        discount = await db.scalar(select(Discount).where(Discount.id == discount_id))
        if not discount:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discount not found.",
            )
        return discount

    async def get_discount_by_code(self, db: AsyncSession, code: str) -> Optional[Discount]:
        return await db.scalar(select(Discount).where(func.upper(Discount.code) == code.strip().upper()))

    async def create_discount(
        self,
        db: AsyncSession,
        current_user: User,
        data: DiscountCreate,
    ) -> Discount:
        self._check_manage_permission(current_user)

        existing = await self.get_discount_by_code(db, data.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Discount with code '{data.code}' already exists.",
            )

        discount = Discount(
            code=data.code.strip().upper(),
            description=data.description,
            discount_type=data.discount_type,
            value=data.value,
            minimum_purchase_amount=data.minimum_purchase_amount,
            minimum_quantity=data.minimum_quantity,
            valid_from=data.valid_from,
            valid_until=data.valid_until,
            max_redemptions=data.max_redemptions,
            applicable_product_id=data.applicable_product_id,
            applicable_plan_id=data.applicable_plan_id,
            is_active=data.is_active,
        )
        db.add(discount)
        await db.commit()
        await db.refresh(discount)
        return discount

    async def update_discount(
        self,
        db: AsyncSession,
        current_user: User,
        discount_id: uuid.UUID,
        data: DiscountUpdate,
    ) -> Discount:
        self._check_manage_permission(current_user)
        discount = await self.get_discount(db, discount_id)

        if data.code and data.code.strip().upper() != discount.code:
            existing = await self.get_discount_by_code(db, data.code)
            if existing and existing.id != discount_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Discount with code '{data.code}' already exists.",
                )
            discount.code = data.code.strip().upper()

        for field in (
            "description",
            "discount_type",
            "value",
            "minimum_purchase_amount",
            "minimum_quantity",
            "valid_from",
            "valid_until",
            "max_redemptions",
            "applicable_product_id",
            "applicable_plan_id",
            "is_active",
        ):
            val = getattr(data, field)
            if val is not None:
                setattr(discount, field, val)

        await db.commit()
        await db.refresh(discount)
        return discount

    async def validate_and_calculate_discount(
        self,
        db: AsyncSession,
        code: str,
        amount: Decimal,
        quantity: int = 1,
        product_id: Optional[uuid.UUID] = None,
        plan_id: Optional[uuid.UUID] = None,
    ) -> Tuple[bool, Decimal, str, Optional[Discount]]:
        discount = await self.get_discount_by_code(db, code)
        if not discount or not discount.is_active:
            return False, Decimal("0.00"), "Discount code is invalid or inactive.", None

        now = utcnow()
        v_from = ensure_utc(discount.valid_from)
        v_until = ensure_utc(discount.valid_until)

        if v_from and v_from > now:
            return False, Decimal("0.00"), "Discount is not yet valid.", None
        if v_until and v_until < now:
            return False, Decimal("0.00"), "Discount has expired.", None

        if discount.max_redemptions and discount.current_redemptions >= discount.max_redemptions:
            return False, Decimal("0.00"), "Discount usage limit has been reached.", None

        if amount < Decimal(str(discount.minimum_purchase_amount)):
            return False, Decimal("0.00"), f"Minimum purchase amount of ${discount.minimum_purchase_amount} required.", None

        if quantity < discount.minimum_quantity:
            return False, Decimal("0.00"), f"Minimum quantity of {discount.minimum_quantity} required.", None

        if discount.applicable_product_id and product_id != discount.applicable_product_id:
            return False, Decimal("0.00"), "Discount does not apply to this product.", None

        if discount.applicable_plan_id and plan_id != discount.applicable_plan_id:
            return False, Decimal("0.00"), "Discount does not apply to this plan.", None

        # Calculate deduction
        if discount.discount_type == DiscountType.FIXED_AMOUNT:
            deduction = min(amount, Decimal(str(discount.value)))
        else:
            # Percentage
            pct = Decimal(str(discount.value)) / Decimal("100")
            deduction = (amount * pct).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            deduction = min(amount, deduction)

        return True, deduction, "Discount applied successfully.", discount

    async def increment_redemption(self, db: AsyncSession, discount_id: uuid.UUID) -> None:
        """Atomically increments redemption count within active transaction."""
        discount = await self.get_discount(db, discount_id)
        if discount.max_redemptions and discount.current_redemptions >= discount.max_redemptions:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Discount usage limit exceeded concurrently.",
            )
        discount.current_redemptions += 1
        await db.flush()


tax_discount_service = TaxDiscountService()
