from datetime import datetime, timedelta, timezone
from decimal import Decimal
import uuid
import pytest

from app.models.plan import BillingInterval, Plan
from app.models.product import Product
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.user import User, UserRole


@pytest.fixture
async def seed_data(db_session):
    admin = User(
        firebase_uid="admin-sub-uid",
        email="admin.sub@brightloop.com",
        full_name="Admin Sub",
        role=UserRole.ADMIN,
        is_active=True,
    )
    cust1 = User(
        firebase_uid="cust1-sub-uid",
        email="cust1.sub@brightloop.com",
        full_name="Customer 1",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    cust2 = User(
        firebase_uid="cust2-sub-uid",
        email="cust2.sub@brightloop.com",
        full_name="Customer 2",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    product = Product(
        name="Platform Service",
        sku="SKU-PLAT-SRV",
        product_type="service",
        is_active=True,
    )
    db_session.add_all([admin, cust1, cust2, product])
    await db_session.flush()

    plan = Plan(
        product_id=product.id,
        code="PLAN-SUB-1",
        name="Standard Monthly Plan",
        billing_interval=BillingInterval.MONTHLY,
        interval_count=1,
        price=Decimal("49.99"),
        minimum_quantity=2,
        is_active=True,
    )
    db_session.add(plan)
    await db_session.commit()

    return {"admin": admin, "cust1": cust1, "cust2": cust2, "product": product, "plan": plan}


@pytest.mark.asyncio
async def test_subscription_creation_and_lifecycle(async_client, seed_data):
    cust1 = seed_data["cust1"]
    plan = seed_data["plan"]
    cust_headers = {"Authorization": "Bearer cust1-sub-uid"}

    # 1. Minimum quantity validation
    fail_qty_resp = await async_client.post(
        "/api/v1/subscriptions",
        json={
            "customer_id": str(cust1.id),
            "plan_id": str(plan.id),
            "quantity": 1,
        },
        headers=cust_headers,
    )
    assert fail_qty_resp.status_code == 400
    assert "Minimum quantity" in fail_qty_resp.json()["detail"]

    # 2. Create Subscription successfully (quantity >= 2)
    sub_resp = await async_client.post(
        "/api/v1/subscriptions",
        json={
            "customer_id": str(cust1.id),
            "plan_id": str(plan.id),
            "quantity": 2,
            "notes": "Direct signup test",
        },
        headers=cust_headers,
    )
    assert sub_resp.status_code == 201
    sub_data = sub_resp.json()
    assert sub_data["status"] == SubscriptionStatus.ACTIVE.value
    assert sub_data["quantity"] == 2
    assert float(sub_data["total_amount"]) == 49.99 * 2
    sub_id = sub_data["id"]

    # 3. Lifecycle: Pause Subscription
    pause_resp = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/pause",
        json={"reason": "Temporary suspension"},
        headers=cust_headers,
    )
    assert pause_resp.status_code == 200
    assert pause_resp.json()["status"] == SubscriptionStatus.PAUSED.value

    # Cannot pause an already paused subscription
    dup_pause = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/pause",
        json={"reason": "Again"},
        headers=cust_headers,
    )
    assert dup_pause.status_code == 400

    # 4. Lifecycle: Resume Subscription
    resume_resp = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/resume",
        headers=cust_headers,
    )
    assert resume_resp.status_code == 200
    assert resume_resp.json()["status"] == SubscriptionStatus.ACTIVE.value

    # Cannot resume an active subscription
    dup_resume = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/resume",
        headers=cust_headers,
    )
    assert dup_resume.status_code == 400

    # 5. Lifecycle: Cancel Subscription
    cancel_resp = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/cancel",
        json={"reason": "No longer needed", "cancel_at_period_end": False},
        headers=cust_headers,
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == SubscriptionStatus.CANCELLED.value

    # Cannot pause a cancelled subscription
    fail_pause = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/pause",
        headers=cust_headers,
    )
    assert fail_pause.status_code == 400


@pytest.mark.asyncio
async def test_subscription_plan_availability_guards(async_client, seed_data):
    admin_headers = {"Authorization": "Bearer admin-sub-uid"}
    cust1 = seed_data["cust1"]
    cust_headers = {"Authorization": "Bearer cust1-sub-uid"}
    prod = seed_data["product"]

    now = datetime.now(timezone.utc)
    past_date = (now - timedelta(days=10)).isoformat()
    yesterday = (now - timedelta(days=1)).isoformat()
    future_date = (now + timedelta(days=10)).isoformat()

    # Expired Plan (available_until in the past)
    exp_plan_resp = await async_client.post(
        "/api/v1/plans",
        json={
            "code": "PLAN-EXP",
            "product_id": str(prod.id),
            "name": "Expired Promo",
            "price": "10.00",
            "billing_interval": "monthly",
            "available_from": past_date,
            "available_until": yesterday,
            "is_active": True,
        },
        headers=admin_headers,
    )
    assert exp_plan_resp.status_code == 201
    exp_plan_id = exp_plan_resp.json()["id"]

    # Attempt signup on expired plan
    exp_signup = await async_client.post(
        "/api/v1/subscriptions",
        json={"customer_id": str(cust1.id), "plan_id": exp_plan_id, "quantity": 1},
        headers=cust_headers,
    )
    assert exp_signup.status_code == 400
    assert "no longer available" in exp_signup.json()["detail"]

    # Future Plan (available_from in future)
    future_plan_resp = await async_client.post(
        "/api/v1/plans",
        json={
            "code": "PLAN-FUTURE",
            "product_id": str(prod.id),
            "name": "Future Early Bird",
            "price": "15.00",
            "billing_interval": "monthly",
            "available_from": future_date,
            "is_active": True,
        },
        headers=admin_headers,
    )
    assert future_plan_resp.status_code == 201
    future_plan_id = future_plan_resp.json()["id"]

    future_signup = await async_client.post(
        "/api/v1/subscriptions",
        json={"customer_id": str(cust1.id), "plan_id": future_plan_id, "quantity": 1},
        headers=cust_headers,
    )
    assert future_signup.status_code == 400
    assert "not yet available" in future_signup.json()["detail"]


@pytest.mark.asyncio
async def test_subscription_customer_isolation(async_client, seed_data):
    admin = seed_data["admin"]
    cust1 = seed_data["cust1"]
    cust2 = seed_data["cust2"]
    plan = seed_data["plan"]
    cust1_headers = {"Authorization": "Bearer cust1-sub-uid"}
    cust2_headers = {"Authorization": "Bearer cust2-sub-uid"}

    # 1. Cust1 cannot create subscription for Cust2 or Admin
    resp = await async_client.post(
        "/api/v1/subscriptions",
        json={"customer_id": str(admin.id), "plan_id": str(plan.id), "quantity": 2},
        headers=cust1_headers,
    )
    assert resp.status_code == 403
    assert "Cannot create subscription for another user" in resp.json()["detail"]

    # 2. Cust1 creates a subscription for Cust1
    create_resp = await async_client.post(
        "/api/v1/subscriptions",
        json={"customer_id": str(cust1.id), "plan_id": str(plan.id), "quantity": 2},
        headers=cust1_headers,
    )
    assert create_resp.status_code == 201
    sub_id = create_resp.json()["id"]

    # 3. Cust2 cannot view or mutate Cust1's subscription
    get_resp = await async_client.get(
        f"/api/v1/subscriptions/{sub_id}",
        headers=cust2_headers,
    )
    assert get_resp.status_code == 403

    pause_resp = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/pause",
        headers=cust2_headers,
    )
    assert pause_resp.status_code == 403

    # 4. Cust1 cannot close subscription (STAFF/ADMIN only)
    cust_close_resp = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/close",
        headers=cust1_headers,
    )
    assert cust_close_resp.status_code == 403

    # 5. Admin can close subscription
    admin_headers = {"Authorization": "Bearer admin-sub-uid"}
    admin_close_resp = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/close",
        headers=admin_headers,
    )
    assert admin_close_resp.status_code == 200
    assert admin_close_resp.json()["status"] == SubscriptionStatus.CLOSED.value
