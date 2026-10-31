import os
import uuid
from typing import AsyncGenerator, Dict
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

# Force testing environment before importing app settings
os.environ["APP_ENV"] = "testing"

from app.core.config import settings
settings.APP_ENV = "testing"

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app import models as _models  # Register all models on Base.metadata
from app.models.user import User, UserRole


# Teach SQLite dialect how to compile PostgreSQL UUID
@compiles(UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


# Static in-memory SQLite engine for 100% isolated and fast offline test runs
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# In-memory mock Firebase storage for tracking user records and link generations
class MockFirebaseStore:
    def __init__(self):
        self.users: Dict[str, dict] = {}
        self.deleted_uids: list = []
        self.generated_reset_links: Dict[str, str] = {}
        self.generated_verify_links: Dict[str, str] = {}
        self.compensation_failure_mode: bool = False

    def reset(self):
        self.users.clear()
        self.deleted_uids.clear()
        self.generated_reset_links.clear()
        self.generated_verify_links.clear()
        self.compensation_failure_mode = False


mock_firebase_store = MockFirebaseStore()


class MockFirebaseUserRecord:
    def __init__(self, uid: str, email: str, display_name: str = "", email_verified: bool = False):
        self.uid = uid
        self.email = email
        self.display_name = display_name
        self.email_verified = email_verified


@pytest_asyncio.fixture(autouse=True)
async def setup_test_database(monkeypatch):
    """Set up database schema once per test and install Firebase Admin SDK test spies."""
    mock_firebase_store.reset()
    settings.APP_ENV = "testing"

    # Pre-populate known test mock identities
    mock_firebase_store.users["test-customer-uid"] = {
        "uid": "test-customer-uid",
        "email": "customer@example.com",
        "email_verified": True,
    }
    mock_firebase_store.users["test-admin-uid"] = {
        "uid": "test-admin-uid",
        "email": "admin@brightloop.com",
        "email_verified": True,
    }
    mock_firebase_store.users["test-staff-uid"] = {
        "uid": "test-staff-uid",
        "email": "staff@brightloop.com",
        "email_verified": False,
    }
    mock_firebase_store.users["test-unverified-uid"] = {
        "uid": "test-unverified-uid",
        "email": "unverified@example.com",
        "email_verified": False,
    }

    # Monkeypatch Firebase Admin SDK authentication functions
    def mock_verify_id_token(token: str, check_revoked: bool = True, *args, **kwargs):
        if token == "invalid-token":
            raise ValueError("Firebase ID token is invalid.")
        if token == "expired-token":
            raise ValueError("Firebase ID token has expired.")
        if token in mock_firebase_store.users:
            return mock_firebase_store.users[token]
        # Return fallback deterministic claims for mock tokens
        return {
            "uid": token,
            "email": f"{token}@example.com",
            "email_verified": True,
        }

    def mock_get_user(uid: str):
        if uid in mock_firebase_store.users:
            u = mock_firebase_store.users[uid]
            return MockFirebaseUserRecord(
                uid=u["uid"],
                email=u["email"],
                display_name=u.get("display_name", ""),
                email_verified=u.get("email_verified", False),
            )
        raise ValueError(f"User {uid} not found in Firebase.")

    def mock_create_user(email: str, display_name: str = "", email_verified: bool = False, **kwargs):
        # Check if email exists
        for u in mock_firebase_store.users.values():
            if u["email"].lower() == email.lower():
                raise ValueError("Email already exists in Firebase.")
        uid = f"mock-uid-{uuid.uuid4().hex[:8]}"
        mock_firebase_store.users[uid] = {
            "uid": uid,
            "email": email,
            "display_name": display_name,
            "email_verified": email_verified,
        }
        return MockFirebaseUserRecord(uid, email, display_name, email_verified)

    def mock_delete_user(uid: str):
        if mock_firebase_store.compensation_failure_mode:
            raise RuntimeError("Simulated Firebase service network failure during compensation.")
        if uid in mock_firebase_store.users:
            del mock_firebase_store.users[uid]
        mock_firebase_store.deleted_uids.append(uid)

    def mock_generate_password_reset_link(email: str):
        link = f"https://mock-auth.local/reset?email={email}&token={uuid.uuid4()}"
        mock_firebase_store.generated_reset_links[email] = link
        return link

    def mock_generate_email_verification_link(email: str):
        link = f"https://mock-auth.local/verify?email={email}&token={uuid.uuid4()}"
        mock_firebase_store.generated_verify_links[email] = link
        return link

    # Patch both firebase_admin.auth and app.core.firebase.auth
    import firebase_admin.auth
    monkeypatch.setattr(firebase_admin.auth, "verify_id_token", mock_verify_id_token)
    monkeypatch.setattr(firebase_admin.auth, "get_user", mock_get_user)
    monkeypatch.setattr(firebase_admin.auth, "create_user", mock_create_user)
    monkeypatch.setattr(firebase_admin.auth, "delete_user", mock_delete_user)
    monkeypatch.setattr(firebase_admin.auth, "generate_password_reset_link", mock_generate_password_reset_link)
    monkeypatch.setattr(firebase_admin.auth, "generate_email_verification_link", mock_generate_email_verification_link)

    import app.core.firebase
    monkeypatch.setattr(app.core.firebase, "initialize_firebase", lambda: None)
    monkeypatch.setattr(app.core.firebase.auth, "verify_id_token", mock_verify_id_token)
    monkeypatch.setattr(app.core.firebase.auth, "get_user", mock_get_user)
    monkeypatch.setattr(app.core.firebase.auth, "create_user", mock_create_user)
    monkeypatch.setattr(app.core.firebase.auth, "delete_user", mock_delete_user)
    monkeypatch.setattr(app.core.firebase.auth, "generate_password_reset_link", mock_generate_password_reset_link)
    monkeypatch.setattr(app.core.firebase.auth, "generate_email_verification_link", mock_generate_email_verification_link)

    # Patch AsyncSessionLocal for CLI commands and services running outside FastAPI dependency injection
    import app.cli.bootstrap_admin
    monkeypatch.setattr(app.cli.bootstrap_admin, "AsyncSessionLocal", TestingSessionLocal)
    import app.db.session
    monkeypatch.setattr(app.db.session, "AsyncSessionLocal", TestingSessionLocal)
    import app.services.billing_scheduler
    monkeypatch.setattr(app.services.billing_scheduler, "AsyncSessionLocal", TestingSessionLocal)

    # Re-create database schema cleanly
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an isolated test session per test."""
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client with get_db dependency overridden to the test database session."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
