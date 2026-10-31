from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field

from app.models.invoice import InvoiceStatus


class InvoiceLineBase(BaseModel):
    description: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(..., ge=0)


class InvoiceLineCreate(InvoiceLineBase):
    pass


class InvoiceLineResponse(InvoiceLineBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID
    line_total: Decimal
    created_at: datetime
    updated_at: datetime


class InvoiceCreate(BaseModel):
    customer_id: uuid.UUID
    subscription_id: Optional[uuid.UUID] = None
    due_date: datetime
    lines: List[InvoiceLineCreate] = Field(..., min_length=1)
    tax_rule_id: Optional[uuid.UUID] = None
    discount_code: Optional[str] = None
    currency: str = Field(default="USD", min_length=3, max_length=3)
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_number: str
    customer_id: uuid.UUID
    subscription_id: Optional[uuid.UUID] = None
    status: InvoiceStatus
    billing_period_start: Optional[datetime] = None
    billing_period_end: Optional[datetime] = None
    issue_date: datetime
    due_date: datetime
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    amount_due: Decimal
    currency: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lines: List[InvoiceLineResponse] = []


class RecurringBillingGenerateRequest(BaseModel):
    target_date: Optional[datetime] = None


class RecurringBillingGenerateResponse(BaseModel):
    invoices_generated: int
    skipped_count: int
    invoice_ids: List[uuid.UUID] = []
    message: str
