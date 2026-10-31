import pytest
from app.cli.bootstrap_admin import run_bootstrap
from app.models.user import User, UserRole
from tests.conftest import mock_firebase_store


@pytest.mark.asyncio
async def test_bootstrap_admin_success(db_session):
    # test-admin-uid is in mock_firebase_store with email admin@brightloop.com and email_verified=True
    await run_bootstrap(
        firebase_uid="test-admin-uid",
        email="admin@brightloop.com",
        full_name="Primary Administrator",
    )

    # Verify user was created with role ADMIN
    from sqlalchemy import select
    admin = await db_session.scalar(select(User).where(User.firebase_uid == "test-admin-uid"))
    assert admin is not None
    assert admin.role == UserRole.ADMIN
    assert admin.email == "admin@brightloop.com"


@pytest.mark.asyncio
async def test_bootstrap_admin_aborts_if_admin_already_exists(db_session):
    # Seed an existing active admin
    existing_admin = User(
        firebase_uid="existing-admin-uid",
        email="existing.admin@brightloop.com",
        full_name="Existing Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )
    db_session.add(existing_admin)
    await db_session.commit()

    # Attempt to bootstrap again should exit with code 1
    with pytest.raises(SystemExit) as exc_info:
        await run_bootstrap(
            firebase_uid="test-admin-uid",
            email="admin@brightloop.com",
            full_name="Second Admin",
        )
    assert exc_info.value.code == 1


@pytest.mark.asyncio
async def test_bootstrap_admin_fails_if_firebase_email_unverified():
    # test-staff-uid in mock_firebase_store has email_verified=False
    with pytest.raises(SystemExit) as exc_info:
        await run_bootstrap(
            firebase_uid="test-staff-uid",
            email="staff@brightloop.com",
            full_name="Unverified Admin Candidate",
        )
    assert exc_info.value.code == 1


@pytest.mark.asyncio
async def test_bootstrap_admin_fails_if_email_mismatch():
    # test-admin-uid has email admin@brightloop.com
    with pytest.raises(SystemExit) as exc_info:
        await run_bootstrap(
            firebase_uid="test-admin-uid",
            email="wrong.email@brightloop.com",
            full_name="Mismatched Admin",
        )
    assert exc_info.value.code == 1


@pytest.mark.asyncio
async def test_bootstrap_admin_fails_if_uid_not_found():
    with pytest.raises(SystemExit) as exc_info:
        await run_bootstrap(
            firebase_uid="nonexistent-uid",
            email="nobody@brightloop.com",
            full_name="Ghost Admin",
        )
    assert exc_info.value.code == 1
