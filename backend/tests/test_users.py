import uuid
import pytest
from unittest.mock import patch

from app.core.config import settings
from app.models.user import User, UserRole
from tests.conftest import mock_firebase_store


@pytest.fixture
async def seed_roles(db_session):
    admin = User(
        firebase_uid="test-admin-uid",
        email="admin@brightloop.com",
        full_name="Primary Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    staff = User(
        firebase_uid="test-staff-uid",
        email="staff@brightloop.com",
        full_name="Operations Staff",
        role=UserRole.STAFF,
        is_active=True,
    )
    customer = User(
        firebase_uid="test-customer-uid",
        email="customer@example.com",
        full_name="Jane Customer",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add_all([admin, staff, customer])
    await db_session.commit()
    return {"admin": admin, "staff": staff, "customer": customer}


@pytest.mark.asyncio
async def test_admin_creates_staff_success_dev_mode(async_client, seed_roles, monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setattr(settings, "DEBUG", True)

    headers = {"Authorization": "Bearer test-admin-uid"}
    payload = {
        "email": "new.staff@brightloop.com",
        "full_name": "New Staff Member",
        "phone_number": "+1987654321",
    }
    response = await async_client.post("/api/v1/users/staff", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "new.staff@brightloop.com"
    assert data["user"]["role"] == "staff"
    assert "firebase_uid" not in data["user"]
    # In dev mode, links are exposed for testing
    assert data["password_setup_link"] is not None
    assert data["email_verification_link"] is not None


@pytest.mark.asyncio
async def test_admin_creates_staff_production_mode_hides_links(async_client, seed_roles, monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(settings, "DEBUG", False)
    # Mock email provider configured
    monkeypatch.setattr("app.services.email_service.email_service.is_configured", lambda: True)
    monkeypatch.setattr("app.services.email_service.email_service.send_staff_onboarding_email", lambda **kw: True)

    headers = {"Authorization": "Bearer test-admin-uid"}
    payload = {
        "email": "prod.staff@brightloop.com",
        "full_name": "Prod Staff Member",
    }
    response = await async_client.post("/api/v1/users/staff", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email_dispatched"] is True
    # In production, links are never exposed in response
    assert data["password_setup_link"] is None
    assert data["email_verification_link"] is None


@pytest.mark.asyncio
async def test_customer_forbidden_from_staff_creation(async_client, seed_roles):
    headers = {"Authorization": "Bearer test-customer-uid"}
    payload = {"email": "illegal.staff@brightloop.com", "full_name": "Illegal Staff"}
    response = await async_client.post("/api/v1/users/staff", json=payload, headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_staff_forbidden_from_staff_creation(async_client, seed_roles):
    headers = {"Authorization": "Bearer test-staff-uid"}
    payload = {"email": "illegal.staff@brightloop.com", "full_name": "Illegal Staff"}
    response = await async_client.post("/api/v1/users/staff", json=payload, headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_staff_creation_db_fail_triggers_compensation(async_client, seed_roles):
    headers = {"Authorization": "Bearer test-admin-uid"}
    payload = {
        "email": "compensated.staff@brightloop.com",
        "full_name": "Compensated Staff",
    }

    # Simulate database flush failure
    with patch("sqlalchemy.ext.asyncio.AsyncSession.flush", side_effect=RuntimeError("Database write error")):
        response = await async_client.post("/api/v1/users/staff", json=payload, headers=headers)
        assert response.status_code == 500
        # Assert that the created Firebase UID was deleted (compensation succeeded)
        assert len(mock_firebase_store.deleted_uids) > 0


@pytest.mark.asyncio
async def test_staff_creation_compensation_failure_logs_critical_alert(async_client, seed_roles):
    headers = {"Authorization": "Bearer test-admin-uid"}
    payload = {
        "email": "critical.staff@brightloop.com",
        "full_name": "Critical Staff",
    }

    mock_firebase_store.compensation_failure_mode = True

    # Simulate database flush failure AND compensation deletion failure
    with patch("sqlalchemy.ext.asyncio.AsyncSession.flush", side_effect=RuntimeError("Database write error")):
        response = await async_client.post("/api/v1/users/staff", json=payload, headers=headers)
        # Should not crash unhandled; must return 500
        assert response.status_code == 500
        assert "identity creation aborted" in response.json()["detail"]


@pytest.mark.asyncio
async def test_resend_staff_links_success(async_client, seed_roles, monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setattr(settings, "DEBUG", True)

    staff_user = seed_roles["staff"]
    # staff_user has email_verified=False in mock_firebase_store
    headers = {"Authorization": "Bearer test-admin-uid"}
    response = await async_client.post(f"/api/v1/users/staff/{staff_user.id}/resend-setup-link", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "onboarding links generated successfully" in data["message"].lower()
    assert data["password_setup_link"] is not None


@pytest.mark.asyncio
async def test_resend_staff_links_already_verified_fails(async_client, seed_roles):
    staff_user = seed_roles["staff"]
    # Mark staff user as already verified in Firebase
    mock_firebase_store.users[staff_user.firebase_uid]["email_verified"] = True

    headers = {"Authorization": "Bearer test-admin-uid"}
    response = await async_client.post(f"/api/v1/users/staff/{staff_user.id}/resend-setup-link", headers=headers)
    assert response.status_code == 409
    assert "already completed onboarding" in response.json()["detail"]


@pytest.mark.asyncio
async def test_staff_user_listing_isolation(async_client, seed_roles):
    headers = {"Authorization": "Bearer test-staff-uid"}
    response = await async_client.get("/api/v1/users", headers=headers)
    assert response.status_code == 200
    data = response.json()
    # Must only return CUSTOMER role
    assert len(data["items"]) == 1
    assert data["items"][0]["role"] == "customer"


@pytest.mark.asyncio
async def test_staff_user_listing_forbidden_on_admin_filter(async_client, seed_roles):
    headers = {"Authorization": "Bearer test-staff-uid"}
    response = await async_client.get("/api/v1/users?role=admin", headers=headers)
    assert response.status_code == 403
    assert "restricted to viewing customer records only" in response.json()["detail"]


@pytest.mark.asyncio
async def test_customer_cannot_list_users(async_client, seed_roles):
    headers = {"Authorization": "Bearer test-customer-uid"}
    response = await async_client.get("/api/v1/users", headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_full_user_listing(async_client, seed_roles):
    headers = {"Authorization": "Bearer test-admin-uid"}
    response = await async_client.get("/api/v1/users", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
