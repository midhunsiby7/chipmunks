from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.plan import BillingInterval
from app.models.subscription import SubscriptionStatus


class SubscriptionLineBase(BaseModel):
    product_variant_id: Optional[uuid.UUID] = None
    description: str = Field(default="Subscription Item", max_length=255)
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(..., ge=0)


class SubscriptionLineCreate(SubscriptionLineBase):
    pass


class SubscriptionLineResponse(SubscriptionLineBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_id: uuid.UUID
    line_total: Decimal
    created_at: datetime
    updated_at: datetime


class SubscriptionBase(BaseModel):
    customer_id: uuid.UUID
    plan_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)
    payment_terms: str = Field(default="due_on_receipt", max_length=100)
    start_date: Optional[datetime] = None
    notes: Optional[str] = None


class SubscriptionCreate(SubscriptionBase):
    trial_days: Optional[int] = Field(default=0, ge=0)
    discount_code: Optional[str] = None
    tax_rule_id: Optional[uuid.UUID] = None
    lines: Optional[List[SubscriptionLineCreate]] = None


class SubscriptionFromQuotationRequest(BaseModel):
    quotation_id: uuid.UUID
    start_date: Optional[datetime] = None


class SubscriptionUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=1)
    payment_terms: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    cancel_at_period_end: Optional[bool] = None


class SubscriptionPauseRequest(BaseModel):
    reason: Optional[str] = None


class SubscriptionCancelRequest(BaseModel):
    cancel_at_period_end: bool = True
    reason: Optional[str] = None


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_code: str
    customer_id: uuid.UUID
    plan_id: uuid.UUID
    status: SubscriptionStatus
    billing_interval: BillingInterval
    quantity: int
    payment_terms: str
    start_date: datetime
    next_billing_date: datetime
    expiry_date: Optional[datetime] = None
    current_period_start: datetime
    current_period_end: datetime
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    cancel_at_period_end: bool
    cancelled_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lines: List[SubscriptionLineResponse] = []
