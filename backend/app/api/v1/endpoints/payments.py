from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    RazorpayOrderCreateRequest,
    RazorpayOrderResponse,
    RazorpayPaymentVerifyRequest,
)
from app.services.payment_service import payment_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[PaymentResponse], summary="List Payments")
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    customer_id: Optional[uuid.UUID] = Query(None),
    invoice_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PaymentResponse]:
    return await payment_service.list_payments(
        db=db,
        current_user=current_user,
        page=page,
        page_size=page_size,
        customer_id=customer_id,
        invoice_id=invoice_id,
    )


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED, summary="Record Payment")
async def record_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    payment = await payment_service.record_payment(db=db, current_user=current_user, data=data)
    return PaymentResponse.model_validate(payment)


@router.get("/{payment_id}", response_model=PaymentResponse, summary="Get Payment Details")
async def get_payment(
    payment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    payment = await payment_service.get_payment(db=db, payment_id=payment_id, current_user=current_user)
    return PaymentResponse.model_validate(payment)


# ------------------ RAZORPAY TEST MODE ENDPOINTS ------------------


@router.post("/razorpay/order", response_model=RazorpayOrderResponse, summary="Create Razorpay Order (Alias)")
@router.post("/razorpay/create-order", response_model=RazorpayOrderResponse, summary="Create Razorpay Order")
async def create_razorpay_order(
    data: RazorpayOrderCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RazorpayOrderResponse:
    return await payment_service.create_razorpay_order(
        db=db, current_user=current_user, invoice_id=data.invoice_id
    )


@router.post("/razorpay/verify", response_model=PaymentResponse, summary="Verify Razorpay Payment Signature")
async def verify_razorpay_payment(
    data: RazorpayPaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    payment = await payment_service.verify_razorpay_payment(
        db=db, current_user=current_user, data=data
    )
    return PaymentResponse.model_validate(payment)


@router.post("/razorpay/webhook", summary="Razorpay Webhook Callback")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    raw_body = await request.body()
    return await payment_service.process_webhook(
        db=db, raw_body=raw_body, signature=x_razorpay_signature
    )
