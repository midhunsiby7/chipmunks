from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.discount import DiscountType


class DiscountBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    discount_type: DiscountType
    value: Decimal = Field(..., gt=0)
    minimum_purchase_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    minimum_quantity: int = Field(default=1, ge=1)
    valid_from: datetime
    valid_until: Optional[datetime] = None
    max_redemptions: Optional[int] = Field(None, ge=1)
    applicable_product_id: Optional[uuid.UUID] = None
    applicable_plan_id: Optional[uuid.UUID] = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_discount(self) -> "DiscountBase":
        if self.discount_type == DiscountType.PERCENTAGE and self.value > 100:
            raise ValueError("Percentage discount cannot exceed 100%")
        if self.valid_until and self.valid_until < self.valid_from:
            raise ValueError("valid_until must be after valid_from")
        return self


class DiscountCreate(DiscountBase):
    pass


class DiscountUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    value: Optional[Decimal] = Field(None, gt=0)
    minimum_purchase_amount: Optional[Decimal] = Field(None, ge=0)
    minimum_quantity: Optional[int] = Field(None, ge=1)
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    max_redemptions: Optional[int] = Field(None, ge=1)
    applicable_product_id: Optional[uuid.UUID] = None
    applicable_plan_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class DiscountResponse(DiscountBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    current_redemptions: int
    created_at: datetime
    updated_at: datetime


class DiscountValidateRequest(BaseModel):
    code: str = Field(..., min_length=1)
    amount: Decimal = Field(..., ge=0)
    quantity: int = Field(default=1, ge=1)
    product_id: Optional[uuid.UUID] = None
    plan_id: Optional[uuid.UUID] = None


class DiscountValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: Optional[DiscountType] = None
    value: Optional[Decimal] = None
    calculated_discount: Decimal = Decimal("0.00")
    message: str
