from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import uuid
from pydantic import BaseModel, model_validator


class RevenueTrendPoint(BaseModel):
    date_label: str
    month: Optional[str] = None
    mrr: Decimal
    collections: Decimal

    @model_validator(mode="after")
    def populate_month(self) -> "RevenueTrendPoint":
        if not self.month:
            self.month = self.date_label
        return self


class RecentSubscriptionItem(BaseModel):
    id: uuid.UUID
    subscription_code: str
    customer_name: str
    plan_name: str
    amount: Decimal
    status: str
    created_at: datetime


class RecentPaymentItem(BaseModel):
    id: uuid.UUID
    payment_reference: str
    invoice_number: str
    customer_name: str
    amount: Decimal
    payment_method: str
    paid_at: Optional[datetime] = None


class AnalyticsDashboardResponse(BaseModel):
    total_customers: int
    total_products: int
    active_subscriptions: int
    paused_subscriptions: int
    closed_subscriptions: int
    total_revenue: Decimal
    total_collections: Decimal
    outstanding_invoices_count: int
    outstanding_amount: Decimal
    overdue_invoices_count: int
    overdue_amount: Decimal
    mrr: Decimal
    arr: Decimal
    revenue_trends: List[RevenueTrendPoint] = []
    recent_subscriptions: List[RecentSubscriptionItem] = []
    recent_payments: List[RecentPaymentItem] = []
