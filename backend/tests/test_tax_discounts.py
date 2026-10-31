from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest

from app.models.user import User, UserRole


@pytest.fixture
async def seed_users(db_session):
    admin = User(
        firebase_uid="admin-tax-uid",
        email="admin.tax@brightloop.com",
        full_name="Admin Tax",
        role=UserRole.ADMIN,
        is_active=True,
    )
    cust = User(
        firebase_uid="cust-tax-uid",
        email="cust.tax@brightloop.com",
        full_name="Cust Tax",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add_all([admin, cust])
    await db_session.commit()
    return {"admin": admin, "customer": cust}


@pytest.mark.asyncio
async def test_tax_rule_crud_and_calculation(async_client, seed_users):
    headers = {"Authorization": "Bearer admin-tax-uid"}
    payload = {
        "name": "CA Sales Tax",
        "tax_code": "TAX-CA-9",
        "rate_percentage": "9.50",
        "country_code": "US",
        "state_or_region": "California",
    }
    r = await async_client.post("/api/v1/taxes", json=payload, headers=headers)
    assert r.status_code == 201
    rule_id = r.json()["id"]

    # Read
    r_get = await async_client.get(f"/api/v1/taxes/{rule_id}", headers=headers)
    assert r_get.status_code == 200
    assert Decimal(str(r_get.json()["rate_percentage"])) == Decimal("9.50")


@pytest.mark.asyncio
async def test_discount_creation_and_validation(async_client, seed_users):
    admin_headers = {"Authorization": "Bearer admin-tax-uid"}
    cust_headers = {"Authorization": "Bearer cust-tax-uid"}
    now = datetime.now(timezone.utc)

    # 1. Percentage discount: 20% off with min purchase $100
    disc_payload = {
        "code": "PROMO20",
        "description": "20% off orders $100+",
        "discount_type": "percentage",
        "value": "20.00",
        "minimum_purchase_amount": "100.00",
        "minimum_quantity": 2,
        "valid_from": (now - timedelta(days=1)).isoformat(),
        "valid_until": (now + timedelta(days=30)).isoformat(),
        "max_redemptions": 10,
    }
    r = await async_client.post("/api/v1/discounts", json=disc_payload, headers=admin_headers)
    assert r.status_code == 201

    # 2. Customer validates promo code with amount $200, qty 2 -> should get $40.00 discount
    val_payload = {
        "code": "PROMO20",
        "amount": "200.00",
        "quantity": 2,
    }
    r_val = await async_client.post("/api/v1/discounts/validate", json=val_payload, headers=cust_headers)
    assert r_val.status_code == 200
    data = r_val.json()
    assert data["valid"] is True
    assert Decimal(str(data["calculated_discount"])) == Decimal("40.00")

    # 3. Validation with below minimum amount $50 -> valid False
    val_fail = {
        "code": "PROMO20",
        "amount": "50.00",
        "quantity": 2,
    }
    r_fail = await async_client.post("/api/v1/discounts/validate", json=val_fail, headers=cust_headers)
    assert r_fail.status_code == 200
    assert r_fail.json()["valid"] is False

    # 4. Validation with below minimum quantity 1 -> valid False
    val_fail_qty = {
        "code": "PROMO20",
        "amount": "200.00",
        "quantity": 1,
    }
    r_fail_qty = await async_client.post("/api/v1/discounts/validate", json=val_fail_qty, headers=cust_headers)
    assert r_fail_qty.status_code == 200
    assert r_fail_qty.json()["valid"] is False


@pytest.mark.asyncio
async def test_expired_discount_rejected(async_client, seed_users):
    admin_headers = {"Authorization": "Bearer admin-tax-uid"}
    cust_headers = {"Authorization": "Bearer cust-tax-uid"}
    now = datetime.now(timezone.utc)

    # Expired yesterday
    disc_payload = {
        "code": "EXPIRED50",
        "description": "Expired promo",
        "discount_type": "fixed_amount",
        "value": "50.00",
        "valid_from": (now - timedelta(days=10)).isoformat(),
        "valid_until": (now - timedelta(days=1)).isoformat(),
    }
    r = await async_client.post("/api/v1/discounts", json=disc_payload, headers=admin_headers)
    assert r.status_code == 201

    r_val = await async_client.post(
        "/api/v1/discounts/validate",
        json={"code": "EXPIRED50", "amount": "100.00", "quantity": 1},
        headers=cust_headers,
    )
    assert r_val.status_code == 200
    assert r_val.json()["valid"] is False
    assert "expired" in r_val.json()["message"].lower()


@pytest.mark.asyncio
async def test_customer_forbidden_from_managing_tax_and_discounts(async_client, seed_users):
    cust_headers = {"Authorization": "Bearer cust-tax-uid"}
    r1 = await async_client.post("/api/v1/taxes", json={"name": "Tax", "tax_code": "TX", "rate_percentage": "5", "country_code": "US"}, headers=cust_headers)
    assert r1.status_code == 403

    r2 = await async_client.post("/api/v1/discounts", json={"code": "D", "discount_type": "percentage", "value": "10", "valid_from": "2026-01-01T00:00:00Z"}, headers=cust_headers)
    assert r2.status_code == 403
