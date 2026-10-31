from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class ProductVariantBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    variant_code: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., ge=0)
    price_difference: Decimal = Field(default=Decimal("0.00"))
    is_active: bool = True


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    variant_code: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[Decimal] = Field(None, ge=0)
    price_difference: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ProductVariantResponse(ProductVariantBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    product_type: str = Field(default="service", max_length=50)
    sales_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    cost_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    internal_notes: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    product_type: Optional[str] = Field(None, max_length=50)
    sales_price: Optional[Decimal] = Field(None, ge=0)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    internal_notes: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    variants: List[ProductVariantResponse] = []
