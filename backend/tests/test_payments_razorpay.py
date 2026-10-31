from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import json
import uuid
import pytest

from app.core.config import settings
from app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.razorpay import RazorpayOrder, WebhookEvent
from app.models.user import User, UserRole


@pytest.fixture
async def seed_data(db_session):
    admin = User(
        firebase_uid="admin-pay-uid",
        email="admin.pay@brightloop.com",
        full_name="Admin Pay",
        role=UserRole.ADMIN,
        is_active=True,
    )
    cust1 = User(
        firebase_uid="cust1-pay-uid",
        email="cust1.pay@brightloop.com",
        full_name="Customer 1 Pay",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    cust2 = User(
        firebase_uid="cust2-pay-uid",
        email="cust2.pay@brightloop.com",
        full_name="Customer 2 Pay",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add_all([admin, cust1, cust2])
    await db_session.flush()

    now = datetime.now(timezone.utc)
    inv1 = Invoice(
        invoice_number="INV-2026-TEST01",
        customer_id=cust1.id,
        status=InvoiceStatus.CONFIRMED,
        issue_date=now,
        due_date=now + timedelta(days=14),
        subtotal=Decimal("200.00"),
        tax_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("200.00"),
        amount_paid=Decimal("0.00"),
        amount_due=Decimal("200.00"),
        currency="USD",
    )
    db_session.add(inv1)
    await db_session.commit()

    return {"admin": admin, "cust1": cust1, "cust2": cust2, "inv1": inv1}


@pytest.mark.asyncio
async def test_manual_payment_recording_and_reconciliation(async_client, seed_data):
    admin_headers = {"Authorization": "Bearer admin-pay-uid"}
    cust1_headers = {"Authorization": "Bearer cust1-pay-uid"}
    cust2_headers = {"Authorization": "Bearer cust2-pay-uid"}
    inv1 = seed_data["inv1"]

    # 1. Customer 2 cannot record payment on Customer 1's invoice
    fail_auth = await async_client.post(
        "/api/v1/payments",
        json={
            "invoice_id": str(inv1.id),
            "amount": "50.00",
            "payment_method": "credit_card",
        },
        headers=cust2_headers,
    )
    assert fail_auth.status_code == 403

    # 2. Overpayment check (> 200.00)
    overpay = await async_client.post(
        "/api/v1/payments",
        json={
            "invoice_id": str(inv1.id),
            "amount": "250.00",
            "payment_method": "credit_card",
        },
        headers=cust1_headers,
    )
    assert overpay.status_code == 400
    assert "exceeds outstanding amount due" in overpay.json()["detail"]

    # 3. Partial payment ($75.00)
    part_resp = await async_client.post(
        "/api/v1/payments",
        json={
            "invoice_id": str(inv1.id),
            "amount": "75.00",
            "payment_method": "credit_card",
            "notes": "First partial installment",
        },
        headers=cust1_headers,
    )
    assert part_resp.status_code == 201
    assert part_resp.json()["amount"] == "75.00"

    # Verify invoice status is now PARTIALLY_PAID
    inv_check = await async_client.get(f"/api/v1/invoices/{inv1.id}", headers=cust1_headers)
    assert inv_check.status_code == 200
    assert inv_check.json()["status"] == InvoiceStatus.PARTIALLY_PAID.value
    assert inv_check.json()["amount_paid"] == "75.00"
    assert inv_check.json()["amount_due"] == "125.00"

    # 4. Final payment ($125.00)
    full_resp = await async_client.post(
        "/api/v1/payments",
        json={
            "invoice_id": str(inv1.id),
            "amount": "125.00",
            "payment_method": "bank_transfer",
            "notes": "Settling remaining balance",
        },
        headers=cust1_headers,
    )
    assert full_resp.status_code == 201

    # Verify invoice status is now PAID
    inv_paid = await async_client.get(f"/api/v1/invoices/{inv1.id}", headers=cust1_headers)
    assert inv_paid.json()["status"] == InvoiceStatus.PAID.value
    assert inv_paid.json()["amount_due"] == "0.00"
    assert inv_paid.json()["amount_paid"] == "200.00"

    # 5. Further payment on PAID invoice is rejected
    extra_pay = await async_client.post(
        "/api/v1/payments",
        json={
            "invoice_id": str(inv1.id),
            "amount": "10.00",
            "payment_method": "credit_card",
        },
        headers=cust1_headers,
    )
    assert extra_pay.status_code == 400


@pytest.mark.asyncio
async def test_razorpay_order_and_signature_verification(async_client, seed_data):
    cust1_headers = {"Authorization": "Bearer cust1-pay-uid"}
    inv1 = seed_data["inv1"]

    # 1. Create Razorpay Order
    order_resp = await async_client.post(
        "/api/v1/payments/razorpay/create-order",
        json={"invoice_id": str(inv1.id)},
        headers=cust1_headers,
    )
    assert order_resp.status_code == 200
    order_data = order_resp.json()
    assert "order_id" in order_data
    assert order_data["amount"] == 20000  # $200.00 in paise
    assert order_data["currency"] == "INR"
    rzp_order_id = order_data["order_id"]

    # 2. Cryptographic signature generation
    secret = settings.RAZORPAY_KEY_SECRET or "mock_secret_for_tests"
    rzp_payment_id = "pay_mock_test_123456"
    msg = f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8")
    valid_sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    # Invalid signature test
    bad_verify = await async_client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": "invalid_signature_hex",
        },
        headers=cust1_headers,
    )
    assert bad_verify.status_code == 400
    assert "Invalid Razorpay payment signature" in bad_verify.json()["detail"]

    # Valid signature test
    good_verify = await async_client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_sig,
        },
        headers=cust1_headers,
    )
    assert good_verify.status_code == 200
    payment_data = good_verify.json()
    assert payment_data["payment_method"] == PaymentMethod.RAZORPAY.value
    assert payment_data["status"] == PaymentStatus.COMPLETED.value
    assert payment_data["amount"] == "200.00"

    # Idempotent re-verification (same rzp_payment_id)
    dup_verify = await async_client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature": valid_sig,
        },
        headers=cust1_headers,
    )
    assert dup_verify.status_code == 200
    assert dup_verify.json()["id"] == payment_data["id"]


@pytest.mark.asyncio
async def test_razorpay_webhook_idempotency(async_client):
    event_payload = json.dumps({
        "id": "evt_test_webhook_001",
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"id": "pay_test_wh", "amount": 20000}}},
    }).encode("utf-8")

    # 1. First delivery
    resp1 = await async_client.post(
        "/api/v1/payments/razorpay/webhook",
        content=event_payload,
        headers={"Content-Type": "application/json"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "processed"

    # 2. Duplicate delivery (same event id)
    resp2 = await async_client.post(
        "/api/v1/payments/razorpay/webhook",
        content=event_payload,
        headers={"Content-Type": "application/json"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "ignored"
