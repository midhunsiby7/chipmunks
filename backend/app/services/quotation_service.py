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
from app.models.quotation import Quotation, QuotationLine, QuotationStatus, QuotationTemplate
from app.models.subscription import Subscription
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.quotation import (
    QuotationCreate,
    QuotationResponse,
    QuotationTemplateCreate,
    QuotationTemplateResponse,
    QuotationTemplateUpdate,
    QuotationUpdate,
)
from app.services.tax_discount_service import tax_discount_service

logger = logging.getLogger(__name__)


def generate_quotation_number(sequence: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"QUO-{year}-{sequence:05d}"


class QuotationService:
    # ------------------ TEMPLATES ------------------

    async def list_templates(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
    ) -> PaginatedResponse[QuotationTemplateResponse]:
        query = select(QuotationTemplate).where(QuotationTemplate.is_active == True)
        total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(QuotationTemplate.name.asc()).offset(offset).limit(page_size))
        templates = results.scalars().all()

        return PaginatedResponse(
            items=[QuotationTemplateResponse.model_validate(t) for t in templates],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )

    async def create_template(
        self,
        db: AsyncSession,
        current_user: User,
        data: QuotationTemplateCreate,
    ) -> QuotationTemplate:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied.")

        tpl = QuotationTemplate(
            name=data.name,
            description=data.description,
            default_validity_days=data.default_validity_days,
            terms_and_conditions=data.terms_and_conditions,
            is_active=data.is_active,
        )
        db.add(tpl)
        await db.commit()
        await db.refresh(tpl)
        return tpl

    # ------------------ QUOTATIONS ------------------

    async def list_quotations(
        self,
        db: AsyncSession,
        current_user: User,
        page: int = 1,
        page_size: int = 20,
        status_filter: Optional[QuotationStatus] = None,
        customer_id: Optional[uuid.UUID] = None,
    ) -> PaginatedResponse[QuotationResponse]:
        query = select(Quotation).options(selectinload(Quotation.lines))

        # Enforce Customer Isolation
        if current_user.role == UserRole.CUSTOMER:
            query = query.where(Quotation.customer_id == current_user.id)
        elif customer_id:
            query = query.where(Quotation.customer_id == customer_id)

        if status_filter:
            query = query.where(Quotation.status == status_filter)

        total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(Quotation.created_at.desc()).offset(offset).limit(page_size))
        quotes = results.scalars().all()

        return PaginatedResponse(
            items=[QuotationResponse.model_validate(q) for q in quotes],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )

    async def get_quotation(
        self,
        db: AsyncSession,
        quotation_id: uuid.UUID,
        current_user: User,
    ) -> Quotation:
        query = (
            select(Quotation)
            .options(selectinload(Quotation.lines))
            .where(Quotation.id == quotation_id)
        )
        quote = await db.scalar(query)
        if not quote:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found.")

        # Customer isolation
        if current_user.role == UserRole.CUSTOMER and quote.customer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        return quote

    async def create_quotation(
        self,
        db: AsyncSession,
        current_user: User,
        data: QuotationCreate,
    ) -> Quotation:
        if current_user.role not in (UserRole.ADMIN, UserRole.STAFF):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customers cannot create quotations.")

        # Sequence count for quotation number
        count = await db.scalar(select(func.count()).select_from(Quotation)) or 0
        quote_number = generate_quotation_number(count + 1)

        # Calculate line totals
        subtotal = Decimal("0.00")
        line_objects = []
        for line in data.lines:
            lt = (Decimal(str(line.unit_price)) * line.quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            subtotal += lt
            line_objects.append(
                QuotationLine(
                    description=line.description,
                    quantity=line.quantity,
                    unit_price=line.unit_price,
                    product_variant_id=line.product_variant_id,
                    plan_id=line.plan_id,
                    discount_amount=line.discount_amount,
                    tax_amount=line.tax_amount,
                    line_total=lt,
                )
            )

        # Discount
        discount_amount = Decimal("0.00")
        if data.discount_code:
            valid, disc, msg, _ = await tax_discount_service.validate_and_calculate_discount(
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

        quotation = Quotation(
            quotation_number=quote_number,
            customer_id=data.customer_id,
            template_id=data.template_id,
            status=QuotationStatus.DRAFT,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            valid_until=data.valid_until,
            terms_and_conditions=data.terms_and_conditions,
            notes=data.notes,
        )
        db.add(quotation)
        await db.flush()

        for l_obj in line_objects:
            l_obj.quotation_id = quotation.id
            db.add(l_obj)

        await db.commit()
        return await self.get_quotation(db, quotation.id, current_user)

    async def send_quotation(
        self,
        db: AsyncSession,
        quotation_id: uuid.UUID,
        current_user: User,
    ) -> Quotation:
        quote = await self.get_quotation(db, quotation_id, current_user)
        if quote.status != QuotationStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only draft quotations can be sent. Current status: {quote.status.value}",
            )
        quote.status = QuotationStatus.SENT
        await db.commit()
        return await self.get_quotation(db, quotation_id, current_user)

    async def accept_quotation(
        self,
        db: AsyncSession,
        quotation_id: uuid.UUID,
        current_user: User,
    ) -> Quotation:
        quote = await self.get_quotation(db, quotation_id, current_user)

        now = utcnow()
        v_until = ensure_utc(quote.valid_until)
        if v_until and v_until < now:
            quote.status = QuotationStatus.EXPIRED
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quotation has expired and cannot be accepted.",
            )

        if quote.status not in (QuotationStatus.DRAFT, QuotationStatus.SENT):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quotation in status '{quote.status.value}' cannot be accepted.",
            )

        quote.status = QuotationStatus.ACCEPTED
        await db.commit()
        return await self.get_quotation(db, quotation_id, current_user)

    async def reject_quotation(
        self,
        db: AsyncSession,
        quotation_id: uuid.UUID,
        current_user: User,
    ) -> Quotation:
        quote = await self.get_quotation(db, quotation_id, current_user)
        if quote.status in (QuotationStatus.ACCEPTED, QuotationStatus.CONVERTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Quotation already {quote.status.value}; cannot reject.",
            )
        quote.status = QuotationStatus.REJECTED
        await db.commit()
        return await self.get_quotation(db, quotation_id, current_user)


quotation_service = QuotationService()
