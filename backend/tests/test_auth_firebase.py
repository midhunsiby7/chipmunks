import pytest
from unittest.mock import patch
from sqlalchemy.exc import IntegrityError

from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_customer_profile_creation_success(async_client, db_session):
    headers = {"Authorization": "Bearer test-customer-uid"}
    payload = {
        "full_name": "Jane Customer",
        "phone_number": "+1234567890",
        "company_name": "Acme Innovations",
    }
    response = await async_client.post("/api/v1/users/profile", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "customer@example.com"
    assert data["full_name"] == "Jane Customer"
    assert data["role"] == "customer"
    assert data["is_active"] is True
    assert "firebase_uid" not in data  # Privacy protection


@pytest.mark.asyncio
async def test_customer_profile_creation_idempotency(async_client, db_session):
    headers = {"Authorization": "Bearer test-customer-uid"}
    payload = {"full_name": "Jane Customer"}
    
    # First creation: 201 Created
    res1 = await async_client.post("/api/v1/users/profile", json=payload, headers=headers)
    assert res1.status_code == 201

    # Second creation with identical UID: 200 OK (idempotent resolution)
    res2 = await async_client.post("/api/v1/users/profile", json=payload, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["id"] == res1.json()["id"]


@pytest.mark.asyncio
async def test_existing_email_different_firebase_uid_fails(async_client, db_session):
    # Seed an existing user with customer@example.com under UID-A
    user_a = User(
        firebase_uid="uid-owner-a",
        email="customer@example.com",
        full_name="Original Owner",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user_a)
    await db_session.commit()

    # Attempt to initialize profile with customer@example.com under a DIFFERENT UID (test-customer-uid)
    headers = {"Authorization": "Bearer test-customer-uid"}
    payload = {"full_name": "Impostor Customer"}
    response = await async_client.post("/api/v1/users/profile", json=payload, headers=headers)
    assert response.status_code == 409
    assert "already exists under a different identifier" in response.json()["detail"]


@pytest.mark.asyncio
async def test_profile_creation_unexpected_integrity_error_reraised(async_client, db_session):
    headers = {"Authorization": "Bearer test-customer-uid"}
    payload = {"full_name": "Jane Customer"}

    # Simulate an unexpected IntegrityError that is NOT a unique collision
    # Asserts that the unexpected exception is re-raised and NOT masked as an email conflict (409)
    with patch("sqlalchemy.ext.asyncio.AsyncSession.flush", side_effect=IntegrityError("CHECK violation", None, Exception("CHECK"))):
        with pytest.raises(IntegrityError):
            await async_client.post("/api/v1/users/profile", json=payload, headers=headers)


@pytest.mark.asyncio
async def test_profile_creation_invalid_firebase_token(async_client):
    headers = {"Authorization": "Bearer invalid-token"}
    payload = {"full_name": "Jane Customer"}
    response = await async_client.post("/api/v1/users/profile", json=payload, headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_profile_me(async_client, db_session):
    # Register customer
    user = User(
        firebase_uid="test-customer-uid",
        email="customer@example.com",
        full_name="Jane Customer",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    headers = {"Authorization": "Bearer test-customer-uid"}
    response = await async_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "customer@example.com"
    assert data["role"] == "customer"
    assert "firebase_uid" not in data


@pytest.mark.asyncio
async def test_get_profile_unregistered_user(async_client):
    headers = {"Authorization": "Bearer unregistered-uid"}
    response = await async_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 404
    assert "not been initialized" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_profile_deactivated_user(async_client, db_session):
    user = User(
        firebase_uid="test-customer-uid",
        email="customer@example.com",
        full_name="Deactivated Customer",
        role=UserRole.CUSTOMER,
        is_active=False,
    )
    db_session.add(user)
    await db_session.commit()

    headers = {"Authorization": "Bearer test-customer-uid"}
    response = await async_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 403
    assert "deactivated" in response.json()["detail"]


@pytest.mark.asyncio
async def test_email_sync_safe_success(async_client, db_session):
    user = User(
        firebase_uid="test-customer-uid",
        email="old_email@example.com",
        full_name="Jane Customer",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # The mock token for test-customer-uid has email: "customer@example.com" and email_verified: True
    headers = {"Authorization": "Bearer test-customer-uid"}
    response = await async_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "customer@example.com"


@pytest.mark.asyncio
async def test_email_sync_collision_blocked(async_client, db_session):
    # Existing user with customer@example.com
    owner = User(
        firebase_uid="owner-uid",
        email="customer@example.com",
        full_name="Existing Owner",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    # Target user with old email
    target = User(
        firebase_uid="test-customer-uid",
        email="old_email@example.com",
        full_name="Target User",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add_all([owner, target])
    await db_session.commit()

    # Token attempts to sync customer@example.com, but owner already owns it
    headers = {"Authorization": "Bearer test-customer-uid"}
    response = await async_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 409
    assert "collides with an existing registered account" in response.json()["detail"]


@pytest.mark.asyncio
async def test_unverified_email_skips_sync(async_client, db_session):
    user = User(
        firebase_uid="test-unverified-uid",
        email="initial_email@example.com",
        full_name="Unverified User",
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # test-unverified-uid token has email_verified=False
    headers = {"Authorization": "Bearer test-unverified-uid"}
    response = await async_client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "initial_email@example.com"  # Stays unchanged


@pytest.mark.asyncio
async def test_expired_firebase_token_rejected(async_client):
    headers = {"Authorization": "Bearer expired-token"}
    payload = {"full_name": "Jane Customer"}
    response = await async_client.post("/api/v1/users/profile", json=payload, headers=headers)
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_missing_authorization_header_rejected(async_client):
    response = await async_client.get("/api/v1/users/me")
    assert response.status_code in (401, 403)


def test_firebase_initialization_missing_credentials_raises_error(monkeypatch):
    import firebase_admin
    from app.core.config import settings
    from app.core.firebase import FirebaseConfigurationError, _real_initialize_firebase

    monkeypatch.setattr(firebase_admin, "_apps", {})
    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setattr(settings, "FIREBASE_CREDENTIALS_PATH", None)
    monkeypatch.setattr(settings, "FIREBASE_CREDENTIALS_JSON", None)
    monkeypatch.setattr(settings, "FIREBASE_AUTH_EMULATOR_HOST", None)
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)

    with pytest.raises(FirebaseConfigurationError) as exc_info:
        _real_initialize_firebase()
    assert "No Firebase credentials found" in str(exc_info.value)


def test_firebase_backend_project_id_matches_frontend():
    from app.core.config import settings
    assert settings.FIREBASE_PROJECT_ID == "subscribtionmanagement"


@pytest.mark.asyncio
async def test_cors_preflight_options(async_client):
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    response = await async_client.options("/api/v1/users/me", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert response.headers.get("access-control-allow-credentials") == "true"
    assert "GET" in response.headers.get("access-control-allow-methods", "")
    assert "authorization" in response.headers.get("access-control-allow-headers", "").lower()


@pytest.mark.asyncio
async def test_cors_headers_on_all_error_types(async_client, db_session):
    cors_origin = {"Origin": "http://localhost:5173"}

    # 1. Missing token (401/403)
    res_no_token = await async_client.get("/api/v1/users/me", headers=cors_origin)
    assert res_no_token.status_code in (401, 403)
    assert res_no_token.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # 2. Invalid token (401)
    res_invalid = await async_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalid-token", **cors_origin},
    )
    assert res_invalid.status_code == 401
    assert res_invalid.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # 3. Unregistered user (404)
    res_404 = await async_client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer unregistered-uid", **cors_origin},
    )
    assert res_404.status_code == 404
    assert res_404.headers.get("access-control-allow-origin") == "http://localhost:5173"


@pytest.mark.asyncio
async def test_cors_headers_on_unhandled_500_exception(async_client):
    """Verify that unhandled backend server errors emit CORS headers so browsers do not mask them as CORS errors."""
    cors_origin = {"Origin": "http://localhost:5173"}

    with patch("app.services.user_service.user_service.initialize_customer_profile", side_effect=RuntimeError("Simulated DB Crash")):
        response = await async_client.post(
            "/api/v1/users/profile",
            json={"full_name": "Crashing User"},
            headers={"Authorization": "Bearer test-customer-uid", **cors_origin},
        )
        assert response.status_code == 500
        assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
        assert response.headers.get("access-control-allow-credentials") == "true"
        data = response.json()
        assert "Internal server error" in data["detail"]


@pytest.mark.asyncio
async def test_complete_customer_auth_lifecycle(async_client, db_session):
    """
    Test the complete reliable lifecycle:
    1. Customer registers in Firebase, token is retrieved.
    2. Frontend onAuthStateChange calls /me -> 404 (not yet in DB).
    3. Frontend calls /profile -> 201 Created.
    4. Frontend /me calls now return 200 OK with correct customer profile.
    5. Repeated /profile calls return 200 OK idempotently without duplicating DB rows.
    """
    token_headers = {"Authorization": "Bearer test-customer-uid"}

    # Step 1: /me before profile creation -> 404
    me_before = await async_client.get("/api/v1/users/me", headers=token_headers)
    assert me_before.status_code == 404

    # Step 2: /profile initializes customer record -> 201
    profile_payload = {
        "full_name": "Alice In Wonderland",
        "phone_number": "+15551234567",
        "company_name": "Rabbit Hole LLC",
    }
    create_res = await async_client.post("/api/v1/users/profile", json=profile_payload, headers=token_headers)
    assert create_res.status_code == 201
    created_user = create_res.json()
    assert created_user["email"] == "customer@example.com"
    assert created_user["role"] == "customer"
    assert created_user["full_name"] == "Alice In Wonderland"

    # Step 3: /me after profile creation -> 200 OK
    me_after = await async_client.get("/api/v1/users/me", headers=token_headers)
    assert me_after.status_code == 200
    assert me_after.json()["id"] == created_user["id"]

    # Step 4: Duplicate /profile call -> 200 OK (idempotent, no error, no duplicate)
    duplicate_res = await async_client.post("/api/v1/users/profile", json=profile_payload, headers=token_headers)
    assert duplicate_res.status_code == 200
    assert duplicate_res.json()["id"] == created_user["id"]

