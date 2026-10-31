import json
import logging
import os
from typing import Any, Dict, Optional
import firebase_admin
from firebase_admin import auth, credentials
from firebase_admin.auth import UserRecord

from app.core.config import settings

logger = logging.getLogger(__name__)


class FirebaseConfigurationError(RuntimeError):
    """Raised when Firebase Authentication cannot be properly initialized."""
    pass


def initialize_firebase() -> None:
    """Initialize Firebase Admin SDK with explicit environment enforcement."""
    if firebase_admin._apps:
        return

    # Handle explicit emulator host
    if settings.FIREBASE_AUTH_EMULATOR_HOST:
        os.environ["FIREBASE_AUTH_EMULATOR_HOST"] = settings.FIREBASE_AUTH_EMULATOR_HOST
        logger.info("Using Firebase Auth Emulator at %s", settings.FIREBASE_AUTH_EMULATOR_HOST)

    if settings.APP_ENV == "testing":
        # In testing environment, initialize with a test project ID without external credentials
        firebase_admin.initialize_app(options={"projectId": "test-project"})
        logger.info("Firebase Admin SDK initialized in testing mode.")
        return

    cred = None
    if settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
    elif settings.FIREBASE_CREDENTIALS_JSON:
        try:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_dict)
        except Exception as exc:
            raise FirebaseConfigurationError(f"Invalid FIREBASE_CREDENTIALS_JSON: {exc}") from exc
    elif settings.FIREBASE_AUTH_EMULATOR_HOST:
        cred = None
    else:
        # In development or production without credentials or emulator, fail explicitly!
        raise FirebaseConfigurationError(
            f"No Firebase credentials found for environment '{settings.APP_ENV}'. "
            "Please provide FIREBASE_CREDENTIALS_PATH or set FIREBASE_AUTH_EMULATOR_HOST."
        )

    firebase_admin.initialize_app(
        cred,
        options={"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None,
    )
    logger.info("Firebase Admin SDK successfully initialized for project '%s'.", settings.FIREBASE_PROJECT_ID)


def verify_firebase_id_token(token: str) -> Dict[str, Any]:
    """
    Cryptographically verify a Firebase ID token.
    Returns decoded token dictionary containing uid, email, and email_verified.
    """
    try:
        initialize_firebase()
        decoded_token = auth.verify_id_token(token, check_revoked=True)
        return decoded_token
    except auth.ExpiredIdTokenError as exc:
        raise ValueError("Firebase ID token has expired.") from exc
    except auth.RevokedIdTokenError as exc:
        raise ValueError("Firebase ID token has been revoked.") from exc
    except auth.InvalidIdTokenError as exc:
        raise ValueError("Firebase ID token is invalid.") from exc
    except Exception as exc:
        raise ValueError(f"Could not validate Firebase credentials: {exc}") from exc


def get_firebase_user(uid: str) -> UserRecord:
    """Retrieve an existing user record from Firebase Authentication."""
    initialize_firebase()
    return auth.get_user(uid)


def create_firebase_user(
    email: str,
    display_name: str,
    phone_number: Optional[str] = None,
) -> UserRecord:
    """Create a new Firebase user identity without a password."""
    initialize_firebase()
    params: Dict[str, Any] = {
        "email": email,
        "display_name": display_name,
        "email_verified": False,
    }
    if phone_number and phone_number.startswith("+"):
        params["phone_number"] = phone_number

    return auth.create_user(**params)


def delete_firebase_user(uid: str) -> None:
    """Delete a Firebase user identity (used for compensation rollbacks)."""
    initialize_firebase()
    auth.delete_user(uid)


def generate_password_reset_link(email: str) -> str:
    """Generate a one-time Firebase password setup/reset link."""
    initialize_firebase()
    return auth.generate_password_reset_link(email)


def generate_email_verification_link(email: str) -> str:
    """Generate a separate one-time Firebase email verification link."""
    initialize_firebase()
    return auth.generate_email_verification_link(email)
