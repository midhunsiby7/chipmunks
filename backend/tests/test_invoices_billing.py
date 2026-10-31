from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import pytest

from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.plan import BillingInterval, Plan
from app.models.product import Product
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from app.models.tax import TaxRule
from app.models.user import User, UserRole


@pytest.fixture
async def seed_data(db_session):
    admin = User(
        firebase_uid="admin-inv-uid",
        email="admin.inv@brightloop.com",
        full_name="Admin Inv",
        role=UserRole.ADMIN,
        is_active=True,
    )
    cust1 = User(
        firebase_uid="cust1-inv-uid",
        email="cust1.inv@brightloop.com",
        full_name="Customer 1 Inv",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    cust2 = User(
        firebase_uid="cust2-inv-uid",
        email="cust2.inv@brightloop.com",
        full_name="Customer 2 Inv",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    product = Product(
        name="Billing Engine Product",
        sku="SKU-BILL-ENG",
        product_type="service",
        is_active=True,
    )
    tax_rule = TaxRule(
        name="Standard Sales Tax",
        tax_code="TAX-STD-10",
        rate_percentage=Decimal("10.00"),
        is_fixed=False,
        country_code="US",
        is_active=True,
    )
    db_session.add_all([admin, cust1, cust2, product, tax_rule])
    await db_session.flush()

    plan = Plan(
        product_id=product.id,
        code="PLAN-BILL-1",
        name="Monthly Pro Engine",
        billing_interval=BillingInterval.MONTHLY,
        interval_count=1,
        price=Decimal("100.00"),
        is_active=True,
    )
    db_session.add(plan)
    await db_session.commit()

    return {
        "admin": admin,
        "cust1": cust1,
        "cust2": cust2,
        "product": product,
        "plan": plan,
        "tax_rule": tax_rule,
    }


@pytest.mark.asyncio
async def test_manual_invoice_creation_and_customer_access(async_client, seed_data):
    admin = seed_data["admin"]
    cust1 = seed_data["cust1"]
    cust2 = seed_data["cust2"]
    tax_rule = seed_data["tax_rule"]
    admin_headers = {"Authorization": "Bearer admin-inv-uid"}
    cust1_headers = {"Authorization": "Bearer cust1-inv-uid"}
    cust2_headers = {"Authorization": "Bearer cust2-inv-uid"}

    # 1. Customer cannot create manual invoice (403)
    fail_create = await async_client.post(
        "/api/v1/invoices",
        json={
            "customer_id": str(cust1.id),
            "lines": [{"description": "Custom Work", "quantity": 1, "unit_price": "200.00"}],
        },
        headers=cust1_headers,
    )
    assert fail_create.status_code == 403

    # 2. Admin creates manual invoice with tax
    now = datetime.now(timezone.utc)
    due = (now + timedelta(days=15)).isoformat()
    inv_resp = await async_client.post(
        "/api/v1/invoices",
        json={
            "customer_id": str(cust1.id),
            "due_date": due,
            "tax_rule_id": str(tax_rule.id),
            "lines": [
                {"description": "Consulting Services", "quantity": 2, "unit_price": "100.00"}
            ],
            "notes": "Manual invoice test",
        },
        headers=admin_headers,
    )
    assert inv_resp.status_code == 201
    inv_data = inv_resp.json()
    assert inv_data["subtotal"] == "200.00"
    assert inv_data["tax_amount"] == "20.00"  # 10% of 200
    assert inv_data["total_amount"] == "220.00"
    assert inv_data["amount_due"] == "220.00"
    assert inv_data["amount_paid"] == "0.00"
    assert inv_data["status"] == InvoiceStatus.CONFIRMED.value
    inv_id = inv_data["id"]

    # 3. Customer 1 can view their invoice
    get_resp = await async_client.get(f"/api/v1/invoices/{inv_id}", headers=cust1_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == inv_id

    # 4. Customer 2 cannot view Customer 1's invoice (403)
    fail_get = await async_client.get(f"/api/v1/invoices/{inv_id}", headers=cust2_headers)
    assert fail_get.status_code == 403

    # 5. Admin can cancel unpaid invoice
    cancel_resp = await async_client.post(f"/api/v1/invoices/{inv_id}/cancel", headers=admin_headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == InvoiceStatus.CANCELLED.value


@pytest.mark.asyncio
async def test_recurring_billing_generation_and_idempotency(async_client, db_session, seed_data):
    admin = seed_data["admin"]
    cust1 = seed_data["cust1"]
    plan = seed_data["plan"]
    admin_headers = {"Authorization": "Bearer admin-inv-uid"}

    now = datetime.now(timezone.utc)
    one_month_ago = now - timedelta(days=32)
    next_bill_due = now - timedelta(days=2)  # In the past -> due for billing

    # Create an active subscription directly in the DB with next_billing_date in the past
    sub = Subscription(
        subscription_code="SUB-TEST-REC-01",
        customer_id=cust1.id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        billing_interval=BillingInterval.MONTHLY,
        quantity=1,
        payment_terms="due_on_receipt",
        start_date=one_month_ago,
        next_billing_date=next_bill_due,
        current_period_start=one_month_ago,
        current_period_end=next_bill_due,
        subtotal=Decimal("100.00"),
        tax_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("100.00"),
    )
    db_session.add(sub)
    await db_session.flush()

    sub_line = SubscriptionLine(
        subscription_id=sub.id,
        description="Monthly Pro Engine",
        quantity=1,
        unit_price=Decimal("100.00"),
        line_total=Decimal("100.00"),
    )
    db_session.add(sub_line)
    await db_session.commit()

    # 1. Trigger recurring billing generation
    gen_resp = await async_client.post(
        "/api/v1/invoices/generate-recurring",
        json={"target_date": now.isoformat()},
        headers=admin_headers,
    )
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["invoices_generated"] == 1
    assert len(gen_data["invoice_ids"]) == 1
    generated_inv_id = gen_data["invoice_ids"][0]

    # Verify generated invoice details
    inv_resp = await async_client.get(f"/api/v1/invoices/{generated_inv_id}", headers=admin_headers)
    assert inv_resp.status_code == 200
    inv = inv_resp.json()
    assert inv["subscription_id"] == str(sub.id)
    assert inv["total_amount"] == "100.00"

    # 2. Trigger again on the same date -> Idempotent, 0 new invoices
    dup_resp = await async_client.post(
        "/api/v1/invoices/generate-recurring",
        json={"target_date": now.isoformat()},
        headers=admin_headers,
    )
    assert dup_resp.status_code == 200
    assert dup_resp.json()["invoices_generated"] == 0


@pytest.mark.asyncio
async def test_recurring_billing_skips_paused_subscriptions(async_client, db_session, seed_data):
    cust1 = seed_data["cust1"]
    plan = seed_data["plan"]
    admin_headers = {"Authorization": "Bearer admin-inv-uid"}

    now = datetime.now(timezone.utc)
    due_date = now - timedelta(days=2)

    # Paused subscription
    sub = Subscription(
        subscription_code="SUB-PAUSED-01",
        customer_id=cust1.id,
        plan_id=plan.id,
        status=SubscriptionStatus.PAUSED,
        billing_interval=BillingInterval.MONTHLY,
        quantity=1,
        start_date=now - timedelta(days=32),
        next_billing_date=due_date,
        current_period_start=now - timedelta(days=32),
        current_period_end=due_date,
        subtotal=Decimal("100.00"),
        total_amount=Decimal("100.00"),
    )
    db_session.add(sub)
    await db_session.commit()

    # Trigger recurring billing
    gen_resp = await async_client.post(
        "/api/v1/invoices/generate-recurring",
        json={"target_date": now.isoformat()},
        headers=admin_headers,
    )
    assert gen_resp.status_code == 200
    assert gen_resp.json()["invoices_generated"] == 0
