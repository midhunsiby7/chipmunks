from datetime import datetime, timezone
from decimal import Decimal
import pytest

from app.models.plan import BillingInterval
from app.models.user import User, UserRole
from app.services.plan_service import compute_next_billing_date


@pytest.fixture
async def seed_users(db_session):
    admin = User(
        firebase_uid="admin-plan-uid",
        email="admin.plan@brightloop.com",
        full_name="Admin Plan",
        role=UserRole.ADMIN,
        is_active=True,
    )
    cust = User(
        firebase_uid="cust-plan-uid",
        email="cust.plan@brightloop.com",
        full_name="Cust Plan",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add_all([admin, cust])
    await db_session.commit()
    return {"admin": admin, "customer": cust}


@pytest.mark.asyncio
async def test_create_and_get_plan(async_client, seed_users):
    headers = {"Authorization": "Bearer admin-plan-uid"}
    payload = {
        "code": "PLAN-TEST-MONTHLY",
        "name": "Standard Monthly",
        "description": "Standard monthly recurring plan",
        "billing_interval": "monthly",
        "interval_count": 1,
        "price": "49.99",
        "currency": "USD",
        "trial_period_days": 7,
        "minimum_quantity": 2,
    }
    r = await async_client.post("/api/v1/plans", json=payload, headers=headers)
    assert r.status_code == 201
    data = r.json()
    assert data["code"] == "PLAN-TEST-MONTHLY"
    assert data["minimum_quantity"] == 2
    assert Decimal(str(data["price"])) == Decimal("49.99")

    # Get plan
    plan_id = data["id"]
    r_get = await async_client.get(f"/api/v1/plans/{plan_id}", headers=headers)
    assert r_get.status_code == 200
    assert r_get.json()["name"] == "Standard Monthly"


@pytest.mark.asyncio
async def test_duplicate_plan_code_fails(async_client, seed_users):
    headers = {"Authorization": "Bearer admin-plan-uid"}
    payload = {
        "code": "PLAN-UNIQUE-1",
        "name": "Unique 1",
        "billing_interval": "monthly",
        "price": "10.00",
    }
    r1 = await async_client.post("/api/v1/plans", json=payload, headers=headers)
    assert r1.status_code == 201

    r2 = await async_client.post("/api/v1/plans", json=payload, headers=headers)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_customer_forbidden_from_plan_creation(async_client, seed_users):
    headers = {"Authorization": "Bearer cust-plan-uid"}
    payload = {
        "code": "PLAN-CUST-FORBIDDEN",
        "name": "Cust Plan",
        "billing_interval": "yearly",
        "price": "100.00",
    }
    r = await async_client.post("/api/v1/plans", json=payload, headers=headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_close_plan(async_client, seed_users):
    headers = {"Authorization": "Bearer admin-plan-uid"}
    r = await async_client.post(
        "/api/v1/plans",
        json={"code": "PLAN-TO-CLOSE", "name": "Closing Plan", "billing_interval": "daily", "price": "5.00"},
        headers=headers,
    )
    plan_id = r.json()["id"]

    r_close = await async_client.post(f"/api/v1/plans/{plan_id}/close", headers=headers)
    assert r_close.status_code == 200
    data = r_close.json()
    assert data["is_active"] is False
    assert data["available_until"] is not None


def test_billing_date_calculations():
    # 1. Daily
    dt = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)
    next_dt = compute_next_billing_date(dt, BillingInterval.DAILY, 3)
    assert next_dt == datetime(2026, 1, 18, 10, 0, 0, tzinfo=timezone.utc)

    # 2. Weekly
    next_dt = compute_next_billing_date(dt, BillingInterval.WEEKLY, 2)
    assert next_dt == datetime(2026, 1, 29, 10, 0, 0, tzinfo=timezone.utc)

    # 3. Monthly - Month length adjustment (Jan 31 -> Feb 28 in non-leap year 2026)
    jan_31 = datetime(2026, 1, 31, 12, 0, 0, tzinfo=timezone.utc)
    feb_end = compute_next_billing_date(jan_31, BillingInterval.MONTHLY, 1)
    assert feb_end == datetime(2026, 2, 28, 12, 0, 0, tzinfo=timezone.utc)

    # 4. Monthly - Leap year (Jan 31 2024 -> Feb 29 2024)
    jan_31_leap = datetime(2024, 1, 31, 12, 0, 0, tzinfo=timezone.utc)
    feb_leap = compute_next_billing_date(jan_31_leap, BillingInterval.MONTHLY, 1)
    assert feb_leap == datetime(2024, 2, 29, 12, 0, 0, tzinfo=timezone.utc)

    # 5. Yearly - Leap day to non-leap year (Feb 29 2024 -> Feb 28 2025)
    leap_day = datetime(2024, 2, 29, 12, 0, 0, tzinfo=timezone.utc)
    yr_next = compute_next_billing_date(leap_day, BillingInterval.YEARLY, 1)
    assert yr_next == datetime(2025, 2, 28, 12, 0, 0, tzinfo=timezone.utc)

    # 6. Yearly - Leap day to next leap year (Feb 29 2024 -> Feb 29 2028, interval_count=4)
    yr_next_leap = compute_next_billing_date(leap_day, BillingInterval.YEARLY, 4)
    assert yr_next_leap == datetime(2028, 2, 29, 12, 0, 0, tzinfo=timezone.utc)
