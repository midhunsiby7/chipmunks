from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.quotation import QuotationStatus


class QuotationTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    default_validity_days: int = Field(default=30, ge=1)
    terms_and_conditions: Optional[str] = None
    is_active: bool = True


class QuotationTemplateCreate(QuotationTemplateBase):
    pass


class QuotationTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    default_validity_days: Optional[int] = Field(None, ge=1)
    terms_and_conditions: Optional[str] = None
    is_active: Optional[bool] = None


class QuotationTemplateResponse(QuotationTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class QuotationLineBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(..., ge=0)
    product_variant_id: Optional[uuid.UUID] = None
    plan_id: Optional[uuid.UUID] = None
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)


class QuotationLineCreate(QuotationLineBase):
    pass


class QuotationLineResponse(QuotationLineBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quotation_id: uuid.UUID
    line_total: Decimal
    created_at: datetime
    updated_at: datetime


class QuotationBase(BaseModel):
    customer_id: uuid.UUID
    template_id: Optional[uuid.UUID] = None
    valid_until: datetime
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None


class QuotationCreate(QuotationBase):
    lines: List[QuotationLineCreate] = Field(..., min_length=1)
    discount_code: Optional[str] = None
    tax_rule_id: Optional[uuid.UUID] = None


class QuotationUpdate(BaseModel):
    template_id: Optional[uuid.UUID] = None
    valid_until: Optional[datetime] = None
    terms_and_conditions: Optional[str] = None
    notes: Optional[str] = None
    lines: Optional[List[QuotationLineCreate]] = None
    discount_code: Optional[str] = None
    tax_rule_id: Optional[uuid.UUID] = None


class QuotationResponse(QuotationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quotation_number: str
    status: QuotationStatus
    converted_subscription_id: Optional[uuid.UUID] = None
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    lines: List[QuotationLineResponse] = []
