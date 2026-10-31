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
        # In testing environment, initialize with configured project ID without external credentials
        firebase_admin.initialize_app(options={"projectId": settings.FIREBASE_PROJECT_ID})
        logger.info("Firebase Admin SDK initialized in testing mode for project '%s'.", settings.FIREBASE_PROJECT_ID)
        return

    cred = None
    gac_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if gac_path and os.path.exists(gac_path):
        logger.info("Loading Firebase credentials from GOOGLE_APPLICATION_CREDENTIALS (%s)", gac_path)
        cred = credentials.Certificate(gac_path)
    elif settings.FIREBASE_CREDENTIALS_PATH and os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        logger.info("Loading Firebase credentials from FIREBASE_CREDENTIALS_PATH (%s)", settings.FIREBASE_CREDENTIALS_PATH)
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
    elif settings.FIREBASE_CREDENTIALS_JSON:
        try:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_dict)
            logger.info("Loading Firebase credentials from FIREBASE_CREDENTIALS_JSON inline secret")
        except Exception as exc:
            raise FirebaseConfigurationError(f"Invalid FIREBASE_CREDENTIALS_JSON: {exc}") from exc
    elif settings.FIREBASE_AUTH_EMULATOR_HOST:
        cred = None
    else:
        # Check ApplicationDefault if available, otherwise fail explicitly
        try:
            cred = credentials.ApplicationDefault()
            cred.get_credential()
            logger.info("Loading Firebase credentials from ApplicationDefault")
        except Exception:
            raise FirebaseConfigurationError(
                f"No Firebase credentials found for environment '{settings.APP_ENV}'. "
                "Please configure GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_CREDENTIALS_PATH, "
                "or FIREBASE_CREDENTIALS_JSON pointing to your Firebase service account JSON."
            )

    firebase_admin.initialize_app(
        cred,
        options={"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None,
    )
    logger.info("Firebase Admin SDK successfully initialized for project '%s'.", settings.FIREBASE_PROJECT_ID)


_real_initialize_firebase = initialize_firebase


def verify_firebase_id_token(token: str, clock_skew_seconds: int = 10) -> Dict[str, Any]:
    """
    Cryptographically verify a Firebase ID token.
    Returns decoded token dictionary containing uid, email, and email_verified.
    Tolerates clock skew between client/host and Google time servers.
    """
    try:
        initialize_firebase()
        decoded_token = auth.verify_id_token(token, check_revoked=True, clock_skew_seconds=clock_skew_seconds)
        return decoded_token
    except auth.ExpiredIdTokenError as exc:
        logger.warning("Firebase ID token expired: %s", exc)
        raise ValueError(f"Firebase ID token has expired: {exc}") from exc
    except auth.RevokedIdTokenError as exc:
        logger.warning("Firebase ID token revoked: %s", exc)
        raise ValueError(f"Firebase ID token has been revoked: {exc}") from exc
    except auth.InvalidIdTokenError as exc:
        logger.warning("Firebase ID token invalid: %s", exc)
        raise ValueError(f"Firebase ID token is invalid: {exc}") from exc
    except Exception as exc:
        logger.error("Could not validate Firebase credentials: %s", exc)
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
