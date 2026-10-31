from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.tax import TaxRuleCreate, TaxRuleResponse, TaxRuleUpdate
from app.services.tax_discount_service import tax_discount_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[TaxRuleResponse], summary="List Tax Rules")
async def list_taxes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    country_code: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[TaxRuleResponse]:
    return await tax_discount_service.list_tax_rules(
        db=db,
        page=page,
        page_size=page_size,
        country_code=country_code,
        is_active=is_active,
    )


@router.post("", response_model=TaxRuleResponse, status_code=status.HTTP_201_CREATED, summary="Create Tax Rule")
async def create_tax(
    data: TaxRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> TaxRuleResponse:
    rule = await tax_discount_service.create_tax_rule(db=db, current_user=current_user, data=data)
    return TaxRuleResponse.model_validate(rule)


@router.get("/{rule_id}", response_model=TaxRuleResponse, summary="Get Tax Rule")
async def get_tax(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaxRuleResponse:
    rule = await tax_discount_service.get_tax_rule(db=db, rule_id=rule_id)
    return TaxRuleResponse.model_validate(rule)


@router.put("/{rule_id}", response_model=TaxRuleResponse, summary="Update Tax Rule")
async def update_tax(
    rule_id: uuid.UUID,
    data: TaxRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> TaxRuleResponse:
    rule = await tax_discount_service.update_tax_rule(
        db=db, current_user=current_user, rule_id=rule_id, data=data
    )
    return TaxRuleResponse.model_validate(rule)
