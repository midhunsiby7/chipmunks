from decimal import Decimal
import uuid
import pytest
from app.models.user import User, UserRole
from app.models.product import Product, ProductVariant
from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from app.models.plan import Plan, BillingInterval


@pytest.fixture
async def seed_users(db_session):
    admin = User(
        firebase_uid="admin-prod-uid",
        email="admin.prod@brightloop.com",
        full_name="Admin Prod",
        role=UserRole.ADMIN,
        is_active=True,
    )
    staff = User(
        firebase_uid="staff-prod-uid",
        email="staff.prod@brightloop.com",
        full_name="Staff Prod",
        role=UserRole.STAFF,
        is_active=True,
    )
    customer = User(
        firebase_uid="customer-prod-uid",
        email="cust.prod@brightloop.com",
        full_name="Cust Prod",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add_all([admin, staff, customer])
    await db_session.commit()
    return {"admin": admin, "staff": staff, "customer": customer}


@pytest.mark.asyncio
async def test_create_product_success(async_client, seed_users):
    headers = {"Authorization": "Bearer admin-prod-uid"}
    payload = {
        "name": "Cloud Pro Engine",
        "sku": "SKU-CLOUD-PRO",
        "description": "High performance cloud engine",
        "product_type": "service",
        "sales_price": "299.00",
        "cost_price": "50.00",
        "variants": [
            {
                "name": "Standard Node",
                "variant_code": "VAR-STD-NODE",
                "price": "299.00",
                "price_difference": "0.00",
            }
        ]
    }
    response = await async_client.post("/api/v1/products", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Cloud Pro Engine"
    assert data["sku"] == "SKU-CLOUD-PRO"
    assert len(data["variants"]) == 1
    assert data["variants"][0]["variant_code"] == "VAR-STD-NODE"


@pytest.mark.asyncio
async def test_duplicate_sku_fails(async_client, seed_users):
    headers = {"Authorization": "Bearer admin-prod-uid"}
    payload = {
        "name": "Duplicate Engine",
        "sku": "SKU-DUP-1",
        "sales_price": "100.00",
    }
    r1 = await async_client.post("/api/v1/products", json=payload, headers=headers)
    assert r1.status_code == 201

    r2 = await async_client.post("/api/v1/products", json=payload, headers=headers)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_customer_forbidden_from_product_management(async_client, seed_users):
    headers = {"Authorization": "Bearer customer-prod-uid"}
    payload = {
        "name": "Customer Engine",
        "sku": "SKU-CUST-1",
        "sales_price": "100.00",
    }
    r = await async_client.post("/api/v1/products", json=payload, headers=headers)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_list_and_get_products(async_client, seed_users):
    admin_headers = {"Authorization": "Bearer admin-prod-uid"}
    cust_headers = {"Authorization": "Bearer customer-prod-uid"}

    # Seed product
    await async_client.post(
        "/api/v1/products",
        json={"name": "Analytics Engine", "sku": "SKU-ANALYTICS", "sales_price": "150.00"},
        headers=admin_headers,
    )

    # Customer can read
    r = await async_client.get("/api/v1/products", headers=cust_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_update_product(async_client, seed_users):
    headers = {"Authorization": "Bearer staff-prod-uid"}
    r = await async_client.post(
        "/api/v1/products",
        json={"name": "Initial Name", "sku": "SKU-UPD-1", "sales_price": "50.00"},
        headers=headers,
    )
    prod_id = r.json()["id"]

    update_payload = {"name": "Updated Name", "sales_price": "75.00"}
    r_up = await async_client.put(f"/api/v1/products/{prod_id}", json=update_payload, headers=headers)
    assert r_up.status_code == 200
    assert r_up.json()["name"] == "Updated Name"
    assert Decimal(str(r_up.json()["sales_price"])) == Decimal("75.00")


@pytest.mark.asyncio
async def test_variant_lifecycle_and_safe_deactivation(async_client, seed_users, db_session):
    headers = {"Authorization": "Bearer admin-prod-uid"}
    r = await async_client.post(
        "/api/v1/products",
        json={"name": "Parent Product", "sku": "SKU-PARENT-VAR", "sales_price": "100.00"},
        headers=headers,
    )
    prod_id = r.json()["id"]

    # Create variant
    var_payload = {
        "name": "Addon Memory",
        "variant_code": "VAR-MEM-1",
        "price": "30.00",
        "price_difference": "30.00",
    }
    r_var = await async_client.post(f"/api/v1/products/{prod_id}/variants", json=var_payload, headers=headers)
    assert r_var.status_code == 201
    var_id = r_var.json()["id"]

    # Delete unreferenced variant -> should delete permanently
    del_res = await async_client.delete(f"/api/v1/products/variants/{var_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["action"] == "deleted"

    # Create another variant and reference it in a subscription line
    r_var2 = await async_client.post(
        f"/api/v1/products/{prod_id}/variants",
        json={"name": "Addon Disk", "variant_code": "VAR-DISK-1", "price": "40.00"},
        headers=headers,
    )
    var_id2 = r_var2.json()["id"]

    # Seed plan & sub referencing var_id2
    plan = Plan(
        code="PLAN-FOR-VAR-TEST",
        name="Plan Var Test",
        billing_interval=BillingInterval.MONTHLY,
        price=Decimal("100.00"),
    )
    db_session.add(plan)
    await db_session.flush()

    sub = Subscription(
        subscription_code="SUB-VAR-TEST",
        customer_id=seed_users["customer"].id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        billing_interval=BillingInterval.MONTHLY,
        start_date=plan.created_at,
        next_billing_date=plan.created_at,
        current_period_start=plan.created_at,
        current_period_end=plan.created_at,
    )
    db_session.add(sub)
    await db_session.flush()

    sub_line = SubscriptionLine(
        subscription_id=sub.id,
        product_variant_id=uuid.UUID(var_id2),
        quantity=1,
        unit_price=Decimal("40.00"),
    )
    db_session.add(sub_line)
    await db_session.commit()

    # Delete referenced variant -> should deactivate safely
    del_res2 = await async_client.delete(f"/api/v1/products/variants/{var_id2}", headers=headers)
    assert del_res2.status_code == 200
    assert del_res2.json()["action"] == "deactivated"
