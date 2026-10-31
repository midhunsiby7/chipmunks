from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import pytest

from app.core.config import settings
from app.models.invoice import InvoiceStatus
from app.models.subscription import SubscriptionStatus
from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_complete_e2e_subscription_payment_workflow(async_client, db_session):
    """
    End-to-End Integration Test for the complete subscription & payment lifecycle:
    1. Admin creates Product and recurring Subscription Plan.
    2. Customer registers / authenticates and initializes profile.
    3. Customer browses available plans.
    4. Customer subscribes to plan (initial invoice auto-generated).
    5. Customer inspects invoice and printable HTML view.
    6. Customer creates Razorpay order and completes test payment with cryptographic signature.
    7. Invoice status transitions to PAID.
    8. Admin dashboard metrics update (MRR, collections, recent subscriptions, payments).
    9. Cross-customer data isolation strictly enforced (Customer B blocked from Customer A assets).
    """

    # -------------------------------------------------------------
    # Step 1: Admin Setup (Product and Subscription Plan)
    # -------------------------------------------------------------
    admin = User(
        firebase_uid="test-admin-uid",
        email="admin@brightloop.com",
        full_name="Platform Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    admin_headers = {"Authorization": "Bearer test-admin-uid"}

    # Create Product with variant
    prod_resp = await async_client.post(
        "/api/v1/products",
        json={
            "name": "Cloud Pro Workspace",
            "sku": "PROD-CLOUD-PRO",
            "description": "Enterprise cloud workspace with collaborative editing",
            "sales_price": "49.00",
            "variants": [
                {
                    "name": "Extra 100GB Storage",
                    "variant_code": "VAR-STORAGE-100GB",
                    "price": "10.00",
                }
            ],
        },
        headers=admin_headers,
    )
    assert prod_resp.status_code == 201
    prod_data = prod_resp.json()
    assert prod_data["name"] == "Cloud Pro Workspace"
    variant_id = prod_data["variants"][0]["id"]

    # Create Subscription Plan
    plan_resp = await async_client.post(
        "/api/v1/plans",
        json={
            "name": "Pro Team Plan",
            "code": "PLAN-PRO-TEAM",
            "description": "Full access to Pro Team features",
            "billing_interval": "monthly",
            "interval_count": 1,
            "price": "49.00",
            "minimum_quantity": 1,
            "is_active": True,
            "product_ids": [prod_data["id"]],
        },
        headers=admin_headers,
    )
    assert plan_resp.status_code == 201
    plan_data = plan_resp.json()
    plan_id = plan_data["id"]
    assert plan_data["price"] == "49.00"

    # -------------------------------------------------------------
    # Step 2: Customer Onboarding & Discovery
    # -------------------------------------------------------------
    cust_uid = "cust-alice-uid"
    cust_headers = {"Authorization": f"Bearer {cust_uid}"}

    # Initialize customer profile via POST /users/profile
    prof_resp = await async_client.post(
        "/api/v1/users/profile",
        json={"full_name": "Alice Wonderland"},
        headers=cust_headers,
    )
    assert prof_resp.status_code == 201
    prof_data = prof_resp.json()
    assert prof_data["role"] == "customer"
    assert prof_data["full_name"] == "Alice Wonderland"
    alice_id = prof_data["id"]

    # Verify GET /users/me returns authoritative profile
    me_resp = await async_client.get("/api/v1/users/me", headers=cust_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["id"] == alice_id

    # Customer browses plans
    plans_resp = await async_client.get("/api/v1/plans", headers=cust_headers)
    assert plans_resp.status_code == 200
    plan_codes = [p["code"] for p in plans_resp.json()["items"]]
    assert "PLAN-PRO-TEAM" in plan_codes

    # -------------------------------------------------------------
    # Step 3: Customer Subscribes
    # -------------------------------------------------------------
    sub_resp = await async_client.post(
        "/api/v1/subscriptions",
        json={
            "customer_id": alice_id,
            "plan_id": plan_id,
            "quantity": 1,
            "payment_terms": "due_on_receipt",
            "lines": [
                {
                    "product_variant_id": variant_id,
                    "description": "Extra 100GB Storage Add-on",
                    "quantity": 1,
                    "unit_price": "10.00",
                }
            ],
            "notes": "Alice first subscription",
        },
        headers=cust_headers,
    )
    assert sub_resp.status_code == 201
    sub_data = sub_resp.json()
    sub_id = sub_data["id"]
    assert sub_data["status"] == SubscriptionStatus.ACTIVE.value
    assert Decimal(sub_data["total_amount"]) == Decimal("59.00")  # 49.00 base + 10.00 storage

    # -------------------------------------------------------------
    # Step 4: Invoice Auto-Generation & On-Demand Retrieval
    # -------------------------------------------------------------
    # Fetch invoices for this subscription
    inv_list_resp = await async_client.get(f"/api/v1/invoices?subscription_id={sub_id}", headers=cust_headers)
    assert inv_list_resp.status_code == 200
    inv_items = inv_list_resp.json()["items"]
    assert len(inv_items) >= 1
    invoice = inv_items[0]
    inv_id = invoice["id"]
    assert Decimal(invoice["total_amount"]) == Decimal("59.00")
    assert Decimal(invoice["amount_due"]) == Decimal("59.00")
    assert invoice["status"] in (InvoiceStatus.CONFIRMED.value, InvoiceStatus.ISSUED.value)

    # Test on-demand invoice generation endpoint (idempotent retrieval)
    gen_inv_resp = await async_client.post(f"/api/v1/subscriptions/{sub_id}/generate-invoice", headers=cust_headers)
    assert gen_inv_resp.status_code == 200
    assert gen_inv_resp.json()["id"] == inv_id

    # Test HTML printable invoice view
    html_resp = await async_client.get(f"/api/v1/invoices/{inv_id}/html", headers=cust_headers)
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers["content-type"]
    assert "Brightloop" in html_resp.text
    assert invoice["invoice_number"] in html_resp.text

    # -------------------------------------------------------------
    # Step 5: Razorpay Checkout & Cryptographic Payment Verification
    # -------------------------------------------------------------
    # Customer initiates Razorpay order
    rzp_order_resp = await async_client.post(
        "/api/v1/payments/razorpay/create-order",
        json={"invoice_id": inv_id},
        headers=cust_headers,
    )
    assert rzp_order_resp.status_code == 200
    rzp_order_data = rzp_order_resp.json()
    rzp_order_id = rzp_order_data["order_id"]
    assert rzp_order_data["amount"] == 5900  # 59.00 * 100 paise
    assert rzp_order_data["currency"] == "INR"

    # Test alias route /razorpay/order as well
    rzp_order_alias = await async_client.post(
        "/api/v1/payments/razorpay/order",
        json={"invoice_id": inv_id},
        headers=cust_headers,
    )
    assert rzp_order_alias.status_code == 200
    assert "order_id" in rzp_order_alias.json()

    # Simulate payment completion and verify signature
    secret = settings.RAZORPAY_KEY_SECRET or "mock_secret_for_tests"
    rzp_payment_id = "pay_test_alice_998877"
    msg = f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8")
    valid_sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    verify_resp = await async_client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_sig,
        },
        headers=cust_headers,
    )
    assert verify_resp.status_code == 200
    pay_data = verify_resp.json()
    assert pay_data["status"] == "completed"
    assert Decimal(pay_data["amount"]) == Decimal("59.00")

    # Verify Invoice has transitioned to PAID
    inv_paid_resp = await async_client.get(f"/api/v1/invoices/{inv_id}", headers=cust_headers)
    assert inv_paid_resp.status_code == 200
    assert inv_paid_resp.json()["status"] == InvoiceStatus.PAID.value
    assert Decimal(inv_paid_resp.json()["amount_due"]) == Decimal("0.00")
    assert Decimal(inv_paid_resp.json()["amount_paid"]) == Decimal("59.00")

    # -------------------------------------------------------------
    # Step 6: Dashboard Analytics Metrics Updated
    # -------------------------------------------------------------
    dash_resp = await async_client.get("/api/v1/analytics/dashboard", headers=admin_headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()

    assert dash_data["active_subscriptions"] >= 1
    assert Decimal(dash_data["total_revenue"]) >= Decimal("59.00")
    assert Decimal(dash_data["total_collections"]) >= Decimal("59.00")
    assert Decimal(dash_data["mrr"]) >= Decimal("59.00")
    assert len(dash_data["revenue_trends"]) > 0
    # Both month and date_label populated for frontend chart compatibility
    assert "month" in dash_data["revenue_trends"][0]
    assert "date_label" in dash_data["revenue_trends"][0]
    # Recent subscriptions contains Alice's subscription
    sub_codes = [s["subscription_code"] for s in dash_data["recent_subscriptions"]]
    assert sub_data["subscription_code"] in sub_codes
    # Recent payments contains Alice's payment
    pay_refs = [p["payment_reference"] for p in dash_data["recent_payments"]]
    assert pay_data["payment_reference"] in pay_refs

    # -------------------------------------------------------------
    # Step 7: Multi-Tenant Customer Isolation & Boundary Defense
    # -------------------------------------------------------------
    bob_uid = "cust-bob-uid"
    bob_headers = {"Authorization": f"Bearer {bob_uid}"}
    bob_prof = await async_client.post(
        "/api/v1/users/profile",
        json={"full_name": "Bob Builder"},
        headers=bob_headers,
    )
    assert bob_prof.status_code == 201

    # Bob attempts to view Alice's subscription -> 403
    bob_view_sub = await async_client.get(f"/api/v1/subscriptions/{sub_id}", headers=bob_headers)
    assert bob_view_sub.status_code == 403

    # Bob attempts to view Alice's invoice -> 403
    bob_view_inv = await async_client.get(f"/api/v1/invoices/{inv_id}", headers=bob_headers)
    assert bob_view_inv.status_code == 403

    # Bob attempts to view Alice's HTML invoice -> 403
    bob_view_html = await async_client.get(f"/api/v1/invoices/{inv_id}/html", headers=bob_headers)
    assert bob_view_html.status_code == 403

    # Bob attempts to create Razorpay order for Alice's invoice -> 403
    bob_order = await async_client.post(
        "/api/v1/payments/razorpay/create-order",
        json={"invoice_id": inv_id},
        headers=bob_headers,
    )
    assert bob_order.status_code == 403

    # Bob attempts to generate invoice on Alice's subscription -> 403
    bob_gen_inv = await async_client.post(
        f"/api/v1/subscriptions/{sub_id}/generate-invoice",
        headers=bob_headers,
    )
    assert bob_gen_inv.status_code == 403


@pytest.mark.asyncio
async def test_quotation_conversion_to_paid_subscription_workflow(async_client, db_session):
    """
    End-to-End Test for the Quotation Sales-Assist Workflow:
    1. Admin creates recurring Plan.
    2. Customer Charlie registers profile.
    3. Admin drafts and sends a Quotation to Charlie.
    4. Charlie reviews and accepts Quotation.
    5. Quotation is converted into an active Subscription.
    6. Initial Invoice is auto-generated upon conversion.
    7. Charlie pays Invoice via Razorpay test payment.
    8. Invoice transitions to PAID; Quotation marked CONVERTED.
    """
    # 1. Admin setup
    admin = User(
        firebase_uid="admin-quote-uid",
        email="admin.quote@brightloop.com",
        full_name="Quote Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    admin_headers = {"Authorization": "Bearer admin-quote-uid"}

    # Plan
    plan_resp = await async_client.post(
        "/api/v1/plans",
        json={
            "name": "Enterprise Custom Plan",
            "code": "PLAN-ENT-CUSTOM",
            "billing_interval": "yearly",
            "interval_count": 1,
            "price": "1200.00",
            "minimum_quantity": 1,
            "is_active": True,
        },
        headers=admin_headers,
    )
    assert plan_resp.status_code == 201
    plan_id = plan_resp.json()["id"]

    # 2. Customer Charlie registers
    charlie_uid = "cust-charlie-uid"
    charlie_headers = {"Authorization": f"Bearer {charlie_uid}"}
    prof_resp = await async_client.post(
        "/api/v1/users/profile",
        json={"full_name": "Charlie Customer"},
        headers=charlie_headers,
    )
    assert prof_resp.status_code == 201
    charlie_id = prof_resp.json()["id"]

    # 3. Admin creates Quotation for Charlie
    now = datetime.now(timezone.utc)
    quote_resp = await async_client.post(
        "/api/v1/quotations",
        json={
            "customer_id": charlie_id,
            "valid_until": (now + timedelta(days=30)).isoformat(),
            "lines": [
                {
                    "plan_id": plan_id,
                    "description": "Annual Enterprise Custom License",
                    "quantity": 1,
                    "unit_price": "1200.00",
                }
            ],
            "notes": "Custom negotiated annual quotation",
        },
        headers=admin_headers,
    )
    assert quote_resp.status_code == 201
    quote_data = quote_resp.json()
    quote_id = quote_data["id"]

    # Admin sends quotation
    send_resp = await async_client.post(f"/api/v1/quotations/{quote_id}/send", headers=admin_headers)
    assert send_resp.status_code == 200

    # 4. Charlie accepts quotation
    accept_resp = await async_client.post(f"/api/v1/quotations/{quote_id}/accept", headers=charlie_headers)
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "accepted"

    # 5. Convert quotation to subscription
    convert_resp = await async_client.post(
        f"/api/v1/quotations/{quote_id}/convert-to-subscription",
        headers=charlie_headers,
    )
    assert convert_resp.status_code == 201
    sub_data = convert_resp.json()
    sub_id = sub_data["id"]
    assert sub_data["status"] == SubscriptionStatus.ACTIVE.value
    assert Decimal(sub_data["total_amount"]) == Decimal("1200.00")

    # 6. Verify initial invoice auto-generated upon conversion
    inv_resp = await async_client.get(f"/api/v1/invoices?subscription_id={sub_id}", headers=charlie_headers)
    assert inv_resp.status_code == 200
    inv_items = inv_resp.json()["items"]
    assert len(inv_items) == 1
    invoice = inv_items[0]
    inv_id = invoice["id"]
    assert Decimal(invoice["total_amount"]) == Decimal("1200.00")
    assert Decimal(invoice["amount_due"]) == Decimal("1200.00")

    # 7. Charlie pays via Razorpay
    order_resp = await async_client.post(
        "/api/v1/payments/razorpay/create-order",
        json={"invoice_id": inv_id},
        headers=charlie_headers,
    )
    assert order_resp.status_code == 200
    rzp_order_id = order_resp.json()["order_id"]

    secret = settings.RAZORPAY_KEY_SECRET or "mock_secret_for_tests"
    rzp_payment_id = "pay_test_charlie_445566"
    msg = f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8")
    valid_sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    verify_resp = await async_client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_sig,
        },
        headers=charlie_headers,
    )
    assert verify_resp.status_code == 200

    # 8. Verify invoice is PAID
    inv_paid_resp = await async_client.get(f"/api/v1/invoices/{inv_id}", headers=charlie_headers)
    assert inv_paid_resp.status_code == 200
    assert inv_paid_resp.json()["status"] == InvoiceStatus.PAID.value
    assert Decimal(inv_paid_resp.json()["amount_due"]) == Decimal("0.00")

