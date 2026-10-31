from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict

from app.models.invoice import InvoiceStatus


class InvoiceLineBase(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float
    line_total: float


class InvoiceLineResponse(InvoiceLineBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_id: uuid.UUID


class InvoiceCreate(BaseModel):
    customer_id: uuid.UUID
    subscription_id: Optional[uuid.UUID] = None
    due_date: datetime
    lines: List[InvoiceLineBase]
    notes: Optional[str] = None


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    invoice_number: str
    customer_id: uuid.UUID
    subscription_id: Optional[uuid.UUID] = None
    status: InvoiceStatus
    issue_date: datetime
    due_date: datetime
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    amount_paid: float
    amount_due: float
    currency: str
    notes: Optional[str] = None
    created_at: datetime
    lines: List[InvoiceLineResponse] = []
