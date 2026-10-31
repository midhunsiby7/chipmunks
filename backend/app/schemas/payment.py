from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentMethod, PaymentStatus


class PaymentBase(BaseModel):
    invoice_id: uuid.UUID
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    payment_method: PaymentMethod = PaymentMethod.MANUAL
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payment_reference: str
    invoice_id: uuid.UUID
    customer_id: uuid.UUID
    amount: Decimal
    currency: str
    payment_method: PaymentMethod
    status: PaymentStatus
    paid_at: Optional[datetime] = None
    gateway_transaction_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RazorpayOrderCreateRequest(BaseModel):
    invoice_id: uuid.UUID


class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str
    key_id: str
    invoice_id: uuid.UUID
    customer_email: str
    customer_name: str


class RazorpayPaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RazorpayWebhookPayload(BaseModel):
    event: str
    payload: Dict[str, Any]
