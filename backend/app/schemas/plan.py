from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.plan import BillingInterval


class PlanBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    billing_interval: BillingInterval
    interval_count: int = Field(default=1, ge=1)
    price: Decimal = Field(..., ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    trial_period_days: int = Field(default=0, ge=0)
    minimum_quantity: int = Field(default=1, ge=1)
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    product_id: Optional[uuid.UUID] = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_dates(self) -> "PlanBase":
        if self.available_from and self.available_until:
            if self.available_until < self.available_from:
                raise ValueError("available_until must be after available_from")
        return self


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    billing_interval: Optional[BillingInterval] = None
    interval_count: Optional[int] = Field(None, ge=1)
    price: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    trial_period_days: Optional[int] = Field(None, ge=0)
    minimum_quantity: Optional[int] = Field(None, ge=1)
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    product_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class PlanResponse(PlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
