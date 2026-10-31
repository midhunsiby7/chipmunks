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
