"""Security module integrating Firebase Authentication token verification."""

from typing import Any, Dict
from app.core.firebase import verify_firebase_id_token


def verify_token(token: str) -> Dict[str, Any]:
    """Verify a client-supplied Bearer token via Firebase Authentication."""
    return verify_firebase_id_token(token)
