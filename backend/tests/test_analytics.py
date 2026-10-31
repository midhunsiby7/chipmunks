from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest

from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.plan import BillingInterval, Plan
from app.models.product import Product
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User, UserRole


@pytest.fixture
async def seed_data(db_session):
    admin = User(
        firebase_uid="admin-analytics-uid",
        email="admin.analytics@brightloop.com",
        full_name="Admin Analytics",
        role=UserRole.ADMIN,
        is_active=True,
    )
    cust = User(
        firebase_uid="cust-analytics-uid",
        email="cust.analytics@brightloop.com",
        full_name="Customer Analytics",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    prod = Product(
        name="Analytics Pro Engine",
        sku="SKU-ANALYTICS-01",
        product_type="service",
        is_active=True,
    )
    db_session.add_all([admin, cust, prod])
    await db_session.flush()

    plan = Plan(
        product_id=prod.id,
        code="PLAN-ANA-01",
        name="Pro Analytics",
        billing_interval=BillingInterval.MONTHLY,
        interval_count=1,
        price=Decimal("150.00"),
        is_active=True,
    )
    db_session.add(plan)
    await db_session.flush()

    now = datetime.now(timezone.utc)
    sub = Subscription(
        subscription_code="SUB-ANA-001",
        customer_id=cust.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        billing_interval=BillingInterval.MONTHLY,
        quantity=2,
        start_date=now - timedelta(days=30),
        next_billing_date=now + timedelta(days=30),
        current_period_start=now - timedelta(days=30),
        current_period_end=now + timedelta(days=30),
        subtotal=Decimal("300.00"),
        total_amount=Decimal("300.00"),
    )
    db_session.add(sub)
    await db_session.flush()

    inv = Invoice(
        invoice_number="INV-ANA-001",
        customer_id=cust.id,
        subscription_id=sub.id,
        status=InvoiceStatus.CONFIRMED,
        issue_date=now,
        due_date=now + timedelta(days=14),
        subtotal=Decimal("300.00"),
        total_amount=Decimal("300.00"),
        amount_paid=Decimal("100.00"),
        amount_due=Decimal("200.00"),
        currency="USD",
    )
    db_session.add(inv)
    await db_session.flush()

    pay = Payment(
        payment_reference="PAY-ANA-001",
        invoice_id=inv.id,
        customer_id=cust.id,
        amount=Decimal("100.00"),
        currency="USD",
        payment_method=PaymentMethod.CREDIT_CARD,
        status=PaymentStatus.COMPLETED,
        paid_at=now,
    )
    db_session.add(pay)
    await db_session.commit()

    return {"admin": admin, "cust": cust}


@pytest.mark.asyncio
async def test_analytics_rbac_and_metrics(async_client, seed_data):
    admin_headers = {"Authorization": "Bearer admin-analytics-uid"}
    cust_headers = {"Authorization": "Bearer cust-analytics-uid"}

    # 1. Customer receives 403 Forbidden
    cust_resp = await async_client.get("/api/v1/analytics/dashboard", headers=cust_headers)
    assert cust_resp.status_code == 403

    # 2. Admin receives 200 OK with accurate executive metrics
    admin_resp = await async_client.get("/api/v1/analytics/dashboard", headers=admin_headers)
    assert admin_resp.status_code == 200
    metrics = admin_resp.json()

    # Total customers & products
    assert metrics["total_customers"] >= 1
    assert metrics["total_products"] >= 1

    # Subscriptions breakdown
    assert metrics["active_subscriptions"] >= 1
    assert metrics["paused_subscriptions"] == 0

    # Financial totals
    assert float(metrics["total_revenue"]) >= 300.00
    assert float(metrics["total_collections"]) >= 100.00
    assert float(metrics["outstanding_amount"]) >= 200.00

    # Recurring revenue
    assert float(metrics["mrr"]) >= 300.00
    assert float(metrics["arr"]) >= 3600.00

    # Recent lists
    assert len(metrics["recent_subscriptions"]) >= 1
    assert len(metrics["recent_payments"]) >= 1
    assert "revenue_trends" in metrics
