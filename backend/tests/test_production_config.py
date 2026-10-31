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
