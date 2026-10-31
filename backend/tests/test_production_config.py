import pytest
from app.core.config import Settings


def test_production_mode_fails_without_credentials_and_smtp(monkeypatch):
    monkeypatch.delenv("FIREBASE_CREDENTIALS_PATH", raising=False)
    monkeypatch.delenv("FIREBASE_CREDENTIALS_JSON", raising=False)
    monkeypatch.delenv("GOOGLE_APPLICATION_CREDENTIALS", raising=False)
    monkeypatch.delenv("SMTP_HOST", raising=False)

    with pytest.raises(ValueError) as exc_info:
        Settings(
            APP_ENV="production",
            FIREBASE_CREDENTIALS_PATH=None,
            FIREBASE_CREDENTIALS_JSON=None,
            SMTP_HOST=None,
        )
    assert "Production environment" in str(exc_info.value)


def test_mock_tokens_rejected_in_production(monkeypatch):
    """Ensure mock evaluator tokens strictly fail cryptographic verification in production mode."""
    from app.core.config import settings
    from app.core.firebase import verify_firebase_id_token

    monkeypatch.setattr(settings, "APP_ENV", "production")

    with pytest.raises(ValueError) as exc_info:
        verify_firebase_id_token("mock-token-admin")
    assert "Firebase ID token" in str(exc_info.value) or "Could not validate Firebase" in str(exc_info.value)
