from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict

from app.models.subscription import SubscriptionStatus


class SubscriptionLineBase(BaseModel):
    product_variant_id: Optional[uuid.UUID] = None
    quantity: int = 1
    unit_price: float


class SubscriptionLineResponse(SubscriptionLineBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_id: uuid.UUID


class SubscriptionBase(BaseModel):
    customer_id: uuid.UUID
    plan_id: uuid.UUID


class SubscriptionCreate(SubscriptionBase):
    trial_days: Optional[int] = 0
    lines: Optional[List[SubscriptionLineBase]] = None


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[uuid.UUID] = None
    status: Optional[SubscriptionStatus] = None
    cancel_at_period_end: Optional[bool] = None


class SubscriptionResponse(SubscriptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    subscription_code: str
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    created_at: datetime
    updated_at: datetime
    lines: List[SubscriptionLineResponse] = []
