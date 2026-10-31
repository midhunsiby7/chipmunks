from datetime import datetime
from decimal import Decimal
from typing import Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class TaxRuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    tax_code: str = Field(..., min_length=1, max_length=50)
    rate_percentage: Decimal = Field(..., ge=0, le=100)
    is_fixed: bool = False
    country_code: str = Field(..., min_length=2, max_length=2)
    state_or_region: Optional[str] = None
    effective_from: Optional[datetime] = None
    effective_until: Optional[datetime] = None
    is_active: bool = True


class TaxRuleCreate(TaxRuleBase):
    pass


class TaxRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    tax_code: Optional[str] = Field(None, min_length=1, max_length=50)
    rate_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    is_fixed: Optional[bool] = None
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    state_or_region: Optional[str] = None
    effective_from: Optional[datetime] = None
    effective_until: Optional[datetime] = None
    is_active: Optional[bool] = None


class TaxRuleResponse(TaxRuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
