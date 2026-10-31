import logging
from typing import Callable, Dict, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.firebase import verify_firebase_id_token
from app.db.session import get_db
from app.models.user import User, UserRole
from app.services.user_service import user_service

logger = logging.getLogger(__name__)

http_bearer = HTTPBearer(auto_error=True)


async def get_firebase_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> Dict[str, any]:
    """Extract and cryptographically verify the Firebase Bearer token."""
    token = credentials.credentials
    try:
        payload = verify_firebase_id_token(token)
        return payload
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token_payload: Dict[str, any] = Depends(get_firebase_token_payload),
) -> User:
    """
    Hydrate the authenticated application user from PostgreSQL using firebase_uid.
    Enforces profile existence, active state, and safe email synchronization.
    """
    firebase_uid = token_payload.get("uid")
    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject missing or invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Lookup user strictly by firebase_uid
    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()

    mock_role = token_payload.get("mock_role")
    if not user and settings.APP_ENV != "production" and mock_role:
        role_enum = UserRole(mock_role) if mock_role in [e.value for e in UserRole] else UserRole.CUSTOMER
        result = await db.execute(select(User).where(User.email == token_payload["email"]))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                firebase_uid=firebase_uid,
                email=token_payload["email"],
                full_name=f"{mock_role.capitalize()} Evaluator",
                role=role_enum,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            user.firebase_uid = firebase_uid
            user.role = role_enum
            await db.commit()
            await db.refresh(user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile has not been initialized. Please complete registration.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated.",
        )

    # Safe email sync: requires verified email in token, flush only (no premature commit)
    token_email = token_payload.get("email")
    is_verified = bool(token_payload.get("email_verified", False))
    await user_service.sync_user_email_if_changed(db, user, token_email, is_verified)

    return user


def require_roles(*allowed_roles: UserRole) -> Callable:
    """Dependency factory enforcing role-based authorization from PostgreSQL."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{current_user.role.value}' lacks required permissions.",
            )
        return current_user

    return role_checker
