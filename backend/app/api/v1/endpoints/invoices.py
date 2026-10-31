from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_roles
from app.models.invoice import InvoiceStatus
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceResponse,
    RecurringBillingGenerateRequest,
    RecurringBillingGenerateResponse,
)
from app.services.invoice_service import invoice_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[InvoiceResponse], summary="List Invoices")
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[InvoiceStatus] = Query(None),
    customer_id: Optional[uuid.UUID] = Query(None),
    subscription_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[InvoiceResponse]:
    return await invoice_service.list_invoices(
        db=db,
        current_user=current_user,
        page=page,
        page_size=page_size,
        status_filter=status,
        customer_id=customer_id,
        subscription_id=subscription_id,
    )


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED, summary="Create Manual Invoice")
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> InvoiceResponse:
    invoice = await invoice_service.create_invoice(db=db, current_user=current_user, data=data)
    return InvoiceResponse.model_validate(invoice)


@router.get("/{invoice_id}", response_model=InvoiceResponse, summary="Get Invoice Details")
async def get_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    invoice = await invoice_service.get_invoice(db=db, invoice_id=invoice_id, current_user=current_user)
    return InvoiceResponse.model_validate(invoice)


@router.post("/generate-recurring", response_model=RecurringBillingGenerateResponse, summary="Generate Recurring Invoices")
async def generate_recurring_invoices(
    data: Optional[RecurringBillingGenerateRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> RecurringBillingGenerateResponse:
    req = data or RecurringBillingGenerateRequest()
    return await invoice_service.generate_recurring_invoices(
        db=db, current_user=current_user, data=req
    )


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse, summary="Cancel Invoice")
async def cancel_invoice(
    invoice_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> InvoiceResponse:
    invoice = await invoice_service.cancel_invoice(db=db, invoice_id=invoice_id, current_user=current_user)
    return InvoiceResponse.model_validate(invoice)
