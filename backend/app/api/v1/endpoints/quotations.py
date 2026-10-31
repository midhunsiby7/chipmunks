from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_roles
from app.models.quotation import QuotationStatus
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.quotation import (
    QuotationCreate,
    QuotationResponse,
    QuotationTemplateCreate,
    QuotationTemplateResponse,
)
from app.schemas.subscription import SubscriptionFromQuotationRequest, SubscriptionResponse
from app.services.quotation_service import quotation_service
from app.services.subscription_service import subscription_service

router = APIRouter()


@router.get("/templates", response_model=PaginatedResponse[QuotationTemplateResponse], summary="List Quotation Templates")
async def list_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[QuotationTemplateResponse]:
    return await quotation_service.list_templates(db=db, page=page, page_size=page_size)


@router.post("/templates", response_model=QuotationTemplateResponse, status_code=status.HTTP_201_CREATED, summary="Create Quotation Template")
async def create_template(
    data: QuotationTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> QuotationTemplateResponse:
    tpl = await quotation_service.create_template(db=db, current_user=current_user, data=data)
    return QuotationTemplateResponse.model_validate(tpl)


@router.get("", response_model=PaginatedResponse[QuotationResponse], summary="List Quotations")
async def list_quotations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[QuotationStatus] = Query(None),
    customer_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[QuotationResponse]:
    return await quotation_service.list_quotations(
        db=db,
        current_user=current_user,
        page=page,
        page_size=page_size,
        status_filter=status,
        customer_id=customer_id,
    )


@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED, summary="Create Quotation")
async def create_quotation(
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> QuotationResponse:
    quote = await quotation_service.create_quotation(db=db, current_user=current_user, data=data)
    return QuotationResponse.model_validate(quote)


@router.get("/{quotation_id}", response_model=QuotationResponse, summary="Get Quotation Details")
async def get_quotation(
    quotation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuotationResponse:
    quote = await quotation_service.get_quotation(db=db, quotation_id=quotation_id, current_user=current_user)
    return QuotationResponse.model_validate(quote)


@router.post("/{quotation_id}/send", response_model=QuotationResponse, summary="Send Quotation to Customer")
async def send_quotation(
    quotation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> QuotationResponse:
    quote = await quotation_service.send_quotation(db=db, quotation_id=quotation_id, current_user=current_user)
    return QuotationResponse.model_validate(quote)


@router.post("/{quotation_id}/accept", response_model=QuotationResponse, summary="Accept Quotation")
async def accept_quotation(
    quotation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuotationResponse:
    quote = await quotation_service.accept_quotation(db=db, quotation_id=quotation_id, current_user=current_user)
    return QuotationResponse.model_validate(quote)


@router.post("/{quotation_id}/reject", response_model=QuotationResponse, summary="Reject Quotation")
async def reject_quotation(
    quotation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuotationResponse:
    quote = await quotation_service.reject_quotation(db=db, quotation_id=quotation_id, current_user=current_user)
    return QuotationResponse.model_validate(quote)


@router.post("/{quotation_id}/convert-to-subscription", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED, summary="Convert Accepted Quotation to Subscription")
async def convert_to_subscription(
    quotation_id: uuid.UUID,
    data: Optional[SubscriptionFromQuotationRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    req = data or SubscriptionFromQuotationRequest(quotation_id=quotation_id)
    req.quotation_id = quotation_id
    sub = await subscription_service.convert_quotation(db=db, current_user=current_user, data=req)
    return SubscriptionResponse.model_validate(sub)
