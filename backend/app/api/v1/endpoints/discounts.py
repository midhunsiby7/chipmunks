from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.discount import (
    DiscountCreate,
    DiscountResponse,
    DiscountUpdate,
    DiscountValidateRequest,
    DiscountValidateResponse,
)
from app.services.tax_discount_service import tax_discount_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DiscountResponse], summary="List Discounts")
async def list_discounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> PaginatedResponse[DiscountResponse]:
    return await tax_discount_service.list_discounts(
        db=db,
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
    )


@router.post("", response_model=DiscountResponse, status_code=status.HTTP_201_CREATED, summary="Create Promotional Discount")
async def create_discount(
    data: DiscountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> DiscountResponse:
    discount = await tax_discount_service.create_discount(db=db, current_user=current_user, data=data)
    return DiscountResponse.model_validate(discount)


@router.get("/{discount_id}", response_model=DiscountResponse, summary="Get Discount Details")
async def get_discount(
    discount_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> DiscountResponse:
    discount = await tax_discount_service.get_discount(db=db, discount_id=discount_id)
    return DiscountResponse.model_validate(discount)


@router.put("/{discount_id}", response_model=DiscountResponse, summary="Update Discount")
async def update_discount(
    discount_id: uuid.UUID,
    data: DiscountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> DiscountResponse:
    discount = await tax_discount_service.update_discount(
        db=db, current_user=current_user, discount_id=discount_id, data=data
    )
    return DiscountResponse.model_validate(discount)


@router.post("/validate", response_model=DiscountValidateResponse, summary="Validate Promo Code")
async def validate_discount_code(
    data: DiscountValidateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DiscountValidateResponse:
    valid, deduction, msg, disc = await tax_discount_service.validate_and_calculate_discount(
        db=db,
        code=data.code,
        amount=data.amount,
        quantity=data.quantity,
        product_id=data.product_id,
        plan_id=data.plan_id,
    )
    return DiscountValidateResponse(
        valid=valid,
        code=data.code.upper(),
        discount_type=disc.discount_type if disc else None,
        value=disc.value if disc else None,
        calculated_discount=deduction,
        message=msg,
    )
