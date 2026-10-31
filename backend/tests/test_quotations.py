from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest

from app.models.plan import BillingInterval, Plan
from app.models.user import User, UserRole


@pytest.fixture
async def seed_data(db_session):
    admin = User(
        firebase_uid="admin-quote-uid",
        email="admin.quote@brightloop.com",
        full_name="Admin Quote",
        role=UserRole.ADMIN,
        is_active=True,
    )
    cust1 = User(
        firebase_uid="cust1-quote-uid",
        email="cust1.quote@brightloop.com",
        full_name="Customer 1",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    cust2 = User(
        firebase_uid="cust2-quote-uid",
        email="cust2.quote@brightloop.com",
        full_name="Customer 2",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    plan = Plan(
        code="PLAN-QUOTE-1",
        name="Quotation Plan",
        billing_interval=BillingInterval.MONTHLY,
        price=Decimal("100.00"),
    )
    db_session.add_all([admin, cust1, cust2, plan])
    await db_session.commit()
    return {"admin": admin, "cust1": cust1, "cust2": cust2, "plan": plan}


@pytest.mark.asyncio
async def test_quotation_template_crud(async_client, seed_data):
    admin_headers = {"Authorization": "Bearer admin-quote-uid"}
    payload = {
        "name": "Standard Enterprise Template",
        "description": "30-day net quotation template",
        "default_validity_days": 30,
        "terms_and_conditions": "Net 30 days.",
    }
    r = await async_client.post("/api/v1/quotations/templates", json=payload, headers=admin_headers)
    assert r.status_code == 201
    assert r.json()["name"] == "Standard Enterprise Template"

    # List templates
    r_list = await async_client.get("/api/v1/quotations/templates", headers=admin_headers)
    assert r_list.status_code == 200
    assert r_list.json()["total"] >= 1


@pytest.mark.asyncio
async def test_quotation_lifecycle_and_conversion(async_client, seed_data):
    admin_headers = {"Authorization": "Bearer admin-quote-uid"}
    cust_headers = {"Authorization": "Bearer cust1-quote-uid"}
    now = datetime.now(timezone.utc)

    # 1. Admin creates quotation for Customer 1
    quote_payload = {
        "customer_id": str(seed_data["cust1"].id),
        "valid_until": (now + timedelta(days=15)).isoformat(),
        "lines": [
            {
                "description": "Monthly Plan Item",
                "quantity": 2,
                "unit_price": "100.00",
                "plan_id": str(seed_data["plan"].id),
            }
        ],
        "notes": "Introductory pricing.",
    }
    r_create = await async_client.post("/api/v1/quotations", json=quote_payload, headers=admin_headers)
    assert r_create.status_code == 201
    quote = r_create.json()
    quote_id = quote["id"]
    assert quote["status"] == "draft"
    assert Decimal(str(quote["subtotal"])) == Decimal("200.00")
    assert Decimal(str(quote["total_amount"])) == Decimal("200.00")

    # 2. Admin sends quotation
    r_send = await async_client.post(f"/api/v1/quotations/{quote_id}/send", headers=admin_headers)
    assert r_send.status_code == 200
    assert r_send.json()["status"] == "sent"

    # 3. Customer 1 accepts quotation
    r_accept = await async_client.post(f"/api/v1/quotations/{quote_id}/accept", headers=cust_headers)
    assert r_accept.status_code == 200
    assert r_accept.json()["status"] == "accepted"

    # 4. Convert accepted quotation to subscription
    r_conv = await async_client.post(f"/api/v1/quotations/{quote_id}/convert-to-subscription", headers=cust_headers)
    assert r_conv.status_code == 201
    sub = r_conv.json()
    assert sub["status"] == "active"
    assert sub["customer_id"] == str(seed_data["cust1"].id)
    assert Decimal(str(sub["total_amount"])) == Decimal("200.00")

    # 5. Duplicate conversion attempt should fail with 409
    r_dup = await async_client.post(f"/api/v1/quotations/{quote_id}/convert-to-subscription", headers=cust_headers)
    assert r_dup.status_code == 409


@pytest.mark.asyncio
async def test_quotation_customer_isolation(async_client, seed_data):
    admin_headers = {"Authorization": "Bearer admin-quote-uid"}
    cust1_headers = {"Authorization": "Bearer cust1-quote-uid"}
    cust2_headers = {"Authorization": "Bearer cust2-quote-uid"}
    now = datetime.now(timezone.utc)

    # Admin creates quotation for Customer 1
    r_create = await async_client.post(
        "/api/v1/quotations",
        json={
            "customer_id": str(seed_data["cust1"].id),
            "valid_until": (now + timedelta(days=10)).isoformat(),
            "lines": [{"description": "Item", "quantity": 1, "unit_price": "50.00"}],
        },
        headers=admin_headers,
    )
    quote_id = r_create.json()["id"]

    # Customer 1 can see it
    r1 = await async_client.get(f"/api/v1/quotations/{quote_id}", headers=cust1_headers)
    assert r1.status_code == 200

    # Customer 2 is blocked (403)
    r2 = await async_client.get(f"/api/v1/quotations/{quote_id}", headers=cust2_headers)
    assert r2.status_code == 403
