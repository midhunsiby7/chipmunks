from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_roles
from app.models.plan import BillingInterval
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.plan import PlanCreate, PlanResponse, PlanUpdate
from app.services.plan_service import plan_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[PlanResponse], summary="List Plans")
async def list_plans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    billing_interval: Optional[BillingInterval] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PlanResponse]:
    return await plan_service.list_plans(
        db=db,
        page=page,
        page_size=page_size,
        billing_interval=billing_interval,
        is_active=is_active,
        search=search,
    )


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED, summary="Create Subscription Plan")
async def create_plan(
    data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> PlanResponse:
    plan = await plan_service.create_plan(db=db, current_user=current_user, data=data)
    return PlanResponse.model_validate(plan)


@router.get("/{plan_id}", response_model=PlanResponse, summary="Get Plan Details")
async def get_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PlanResponse:
    plan = await plan_service.get_plan(db=db, plan_id=plan_id)
    return PlanResponse.model_validate(plan)


@router.put("/{plan_id}", response_model=PlanResponse, summary="Update Subscription Plan")
async def update_plan(
    plan_id: uuid.UUID,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> PlanResponse:
    plan = await plan_service.update_plan(
        db=db, current_user=current_user, plan_id=plan_id, data=data
    )
    return PlanResponse.model_validate(plan)


@router.post("/{plan_id}/close", response_model=PlanResponse, summary="Close Subscription Plan")
async def close_plan(
    plan_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> PlanResponse:
    plan = await plan_service.close_plan(db=db, current_user=current_user, plan_id=plan_id)
    return PlanResponse.model_validate(plan)
