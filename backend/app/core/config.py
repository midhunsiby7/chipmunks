import os
from typing import List, Optional, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    APP_NAME: str = "Brightloop Subscription Management API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "temporary-insecure-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # PostgreSQL settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "brightloop_user"
    POSTGRES_PASSWORD: str = "brightloop_password"
    POSTGRES_DB: str = "brightloop_db"
    DATABASE_URL: str = "postgresql+asyncpg://brightloop_user:brightloop_password@localhost:5432/brightloop_db"
    DATABASE_URL_SYNC: str = "postgresql://brightloop_user:brightloop_password@localhost:5432/brightloop_db"

    # Firebase Authentication & Admin SDK
    FIREBASE_PROJECT_ID: str = "subscribtionmanagement"
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None
    FIREBASE_AUTH_EMULATOR_HOST: Optional[str] = None

    # Transactional Email Provider (Required in Production)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: str = "noreply@brightloop.local"

    # Razorpay Test Mode Configuration
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None

    # In-Process Automated Recurring Billing Scheduler
    BILLING_SCHEDULER_ENABLED: bool = True
    BILLING_SCHEDULER_INTERVAL_SECONDS: int = 300

    # CORS origins
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    @model_validator(mode="after")
    def validate_production_environment(self) -> "Settings":
        """Enforce strict production safeguards against missing credentials or email providers."""
        if self.APP_ENV == "production":
            # 1. Require Firebase credentials
            gac_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            has_credentials = (
                (self.FIREBASE_CREDENTIALS_PATH and os.path.exists(self.FIREBASE_CREDENTIALS_PATH))
                or bool(self.FIREBASE_CREDENTIALS_JSON)
                or (gac_path and os.path.exists(gac_path))
            )
            if not has_credentials:
                raise ValueError(
                    "Production environment (APP_ENV=production) requires valid GOOGLE_APPLICATION_CREDENTIALS, "
                    "FIREBASE_CREDENTIALS_PATH, or FIREBASE_CREDENTIALS_JSON."
                )

            # 2. Require transactional email provider
            if not self.SMTP_HOST:
                raise ValueError(
                    "Production environment (APP_ENV=production) requires a configured transactional email provider (SMTP_HOST)."
                )

        return self


settings = Settings()
