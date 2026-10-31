from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_roles
from app.models.subscription import SubscriptionStatus
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.subscription import (
    SubscriptionCancelRequest,
    SubscriptionCreate,
    SubscriptionPauseRequest,
    SubscriptionResponse,
    SubscriptionUpdate,
)
from app.services.subscription_service import subscription_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[SubscriptionResponse], summary="List Subscriptions")
async def list_subscriptions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[SubscriptionStatus] = Query(None),
    customer_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[SubscriptionResponse]:
    return await subscription_service.list_subscriptions(
        db=db,
        current_user=current_user,
        page=page,
        page_size=page_size,
        status_filter=status,
        customer_id=customer_id,
    )


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED, summary="Create Subscription")
async def create_subscription(
    data: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    sub = await subscription_service.create_subscription(db=db, current_user=current_user, data=data)
    return SubscriptionResponse.model_validate(sub)


@router.get("/{subscription_id}", response_model=SubscriptionResponse, summary="Get Subscription Details")
async def get_subscription(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    sub = await subscription_service.get_subscription(db=db, subscription_id=subscription_id, current_user=current_user)
    return SubscriptionResponse.model_validate(sub)


@router.post("/{subscription_id}/pause", response_model=SubscriptionResponse, summary="Pause Subscription")
async def pause_subscription(
    subscription_id: uuid.UUID,
    data: Optional[SubscriptionPauseRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    req = data or SubscriptionPauseRequest()
    sub = await subscription_service.pause_subscription(
        db=db, subscription_id=subscription_id, current_user=current_user, data=req
    )
    return SubscriptionResponse.model_validate(sub)


@router.post("/{subscription_id}/resume", response_model=SubscriptionResponse, summary="Resume Subscription")
async def resume_subscription(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    sub = await subscription_service.resume_subscription(
        db=db, subscription_id=subscription_id, current_user=current_user
    )
    return SubscriptionResponse.model_validate(sub)


@router.post("/{subscription_id}/cancel", response_model=SubscriptionResponse, summary="Cancel Subscription")
async def cancel_subscription(
    subscription_id: uuid.UUID,
    data: Optional[SubscriptionCancelRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    req = data or SubscriptionCancelRequest()
    sub = await subscription_service.cancel_subscription(
        db=db, subscription_id=subscription_id, current_user=current_user, data=req
    )
    return SubscriptionResponse.model_validate(sub)


@router.post("/{subscription_id}/close", response_model=SubscriptionResponse, summary="Close Subscription")
async def close_subscription(
    subscription_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> SubscriptionResponse:
    sub = await subscription_service.close_subscription(
        db=db, subscription_id=subscription_id, current_user=current_user
    )
    return SubscriptionResponse.model_validate(sub)
