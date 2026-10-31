import logging
import math
from typing import List, Optional, Tuple
import uuid
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.firebase import (
    create_firebase_user,
    delete_firebase_user,
    generate_email_verification_link,
    generate_password_reset_link,
    get_firebase_user,
)
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.user import (
    CustomerProfileCreateRequest,
    ResendLinksResponse,
    StaffCreateRequest,
    StaffCreateResponse,
    UserResponse,
)
from app.services.email_service import EmailDeliveryError, email_service

logger = logging.getLogger(__name__)


class UserService:
    @staticmethod
    async def initialize_customer_profile(
        db: AsyncSession,
        firebase_uid: str,
        email: str,
        profile_data: CustomerProfileCreateRequest,
    ) -> Tuple[User, bool]:
        """
        Idempotent customer profile creation handling race conditions,
        genuine collisions, and unexpected database integrity errors.
        Returns: (user, created_flag)
        """
        # 1. Optimistic check by UID
        existing_user = await db.scalar(
            select(User).where(User.firebase_uid == firebase_uid)
        )
        if existing_user:
            return existing_user, False

        # 2. Check for pre-existing email collision under a different identity
        email_collision = await db.scalar(
            select(User).where(User.email == email)
        )
        if email_collision:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists under a different identifier.",
            )

        # 3. Attempt insertion
        new_user = User(
            firebase_uid=firebase_uid,
            email=email,
            full_name=profile_data.full_name,
            phone_number=profile_data.phone_number,
            company_name=profile_data.company_name,
            role=UserRole.CUSTOMER,  # Strictly hardcoded
            is_active=True,
        )
        db.add(new_user)

        try:
            await db.flush()
            return new_user, True
        except IntegrityError as exc:
            await db.rollback()

            # 4. Handle race condition: check if a concurrent request created this exact UID
            concurrent_user = await db.scalar(
                select(User).where(User.firebase_uid == firebase_uid)
            )
            if concurrent_user:
                return concurrent_user, False  # Successfully resolved idempotently

            # 5. Check if another concurrent request registered the same email with a different UID
            concurrent_email_user = await db.scalar(
                select(User).where(User.email == email)
            )
            if concurrent_email_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email address already exists under a different identifier.",
                )

            # 6. Re-raise unexpected integrity errors (e.g. check constraints, null violations)
            logger.error("Unexpected integrity error during customer profile creation: %s", exc)
            raise exc

    @staticmethod
    async def create_staff_account(
        db: AsyncSession,
        admin_user: User,
        staff_data: StaffCreateRequest,
    ) -> StaffCreateResponse:
        """
        Admin-only staff provisioning workflow.
        Decouples atomic identity creation (pre-commit) from email delivery (post-commit).
        """
        if admin_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators may provision staff accounts.",
            )

        # Pre-check email uniqueness in PostgreSQL
        existing = await db.scalar(select(User).where(User.email == staff_data.email))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address is already registered in the system.",
            )

        # Production safeguard: ensure email service is ready
        if settings.APP_ENV == "production" and not email_service.is_configured():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Transactional email provider is not configured. Staff creation aborted.",
            )

        # Step 1: Create Firebase identity
        try:
            fb_user = create_firebase_user(
                email=staff_data.email,
                display_name=staff_data.full_name,
                phone_number=staff_data.phone_number,
            )
        except Exception as exc:
            logger.warning("Firebase user creation rejected: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Could not create authentication identity: {exc}",
            ) from exc

        new_uid = fb_user.uid

        # Step 2: Generate Password Setup Link
        try:
            pwd_link = generate_password_reset_link(staff_data.email)
        except Exception as exc:
            logger.error("Failed to generate password reset link for staff: %s", exc)
            delete_firebase_user(new_uid)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to generate staff credential setup link; account creation aborted.",
            ) from exc

        # Step 3: Generate Email Verification Link
        try:
            verify_link = generate_email_verification_link(staff_data.email)
        except Exception as exc:
            logger.error("Failed to generate email verification link for staff: %s", exc)
            delete_firebase_user(new_uid)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to generate staff email verification link; account creation aborted.",
            ) from exc

        # Step 4: Insert into PostgreSQL and commit
        staff_user = User(
            firebase_uid=new_uid,
            email=staff_data.email,
            full_name=staff_data.full_name,
            phone_number=staff_data.phone_number,
            company_name=staff_data.company_name or "Brightloop Internal",
            role=UserRole.STAFF,
            is_active=True,
        )
        db.add(staff_user)

        try:
            await db.flush()
            await db.commit()
            await db.refresh(staff_user)
        except Exception as exc:
            await db.rollback()
            # Attempt compensation deletion of Firebase account
            try:
                delete_firebase_user(new_uid)
                logger.info("Successfully compensated and rolled back Firebase user %s after DB error.", new_uid)
            except Exception as fb_exc:
                logger.critical(
                    "CRITICAL: ORPHANED_FIREBASE_USER | uid=%s | email=%s | db_error=%s | compensation_error=%s",
                    new_uid,
                    staff_data.email,
                    exc,
                    fb_exc,
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist staff profile in database; identity creation aborted.",
            ) from exc

        # Step 5: Post-Commit Email Delivery
        email_dispatched = False
        try:
            email_dispatched = email_service.send_staff_onboarding_email(
                to_email=staff_data.email,
                full_name=staff_data.full_name,
                password_setup_link=pwd_link,
                email_verification_link=verify_link,
            )
        except EmailDeliveryError as exc:
            logger.warning(
                "Staff account committed (id=%s), but onboarding email delivery failed: %s",
                staff_user.id,
                exc,
            )
            email_dispatched = False

        # Expose links in response strictly in development mode with debug active
        expose_links = (settings.APP_ENV == "development" and settings.DEBUG is True)

        return StaffCreateResponse(
            user=UserResponse.model_validate(staff_user),
            email_dispatched=email_dispatched,
            password_setup_link=pwd_link if expose_links else None,
            email_verification_link=verify_link if expose_links else None,
        )

    @staticmethod
    async def resend_staff_links(
        db: AsyncSession,
        admin_user: User,
        staff_id: uuid.UUID,
    ) -> ResendLinksResponse:
        """
        Admin-only operation to re-dispatch setup and verification links
        for staff members whose onboarding is pending.
        """
        if admin_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators may resend staff onboarding links.",
            )

        target_user = await db.scalar(select(User).where(User.id == staff_id))
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found.",
            )

        if target_user.role != UserRole.STAFF:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target user is not a staff member.",
            )

        # Retrieve Firebase account and verify onboarding status
        try:
            fb_user = get_firebase_user(target_user.firebase_uid)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Firebase identity not found for staff user: {exc}",
            ) from exc

        if fb_user.email_verified is True:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Staff account has already completed onboarding and verified their email address. "
                "Use standard password reset for credential recovery.",
            )

        # Generate fresh links
        try:
            pwd_link = generate_password_reset_link(target_user.email)
            verify_link = generate_email_verification_link(target_user.email)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to generate fresh onboarding links: {exc}",
            ) from exc

        email_dispatched = False
        try:
            email_dispatched = email_service.send_staff_onboarding_email(
                to_email=target_user.email,
                full_name=target_user.full_name,
                password_setup_link=pwd_link,
                email_verification_link=verify_link,
            )
        except EmailDeliveryError as exc:
            logger.warning("Resend onboarding email delivery failed for user %s: %s", staff_id, exc)
            email_dispatched = False

        expose_links = (settings.APP_ENV == "development" and settings.DEBUG is True)

        return ResendLinksResponse(
            message="Staff onboarding links generated successfully.",
            email_dispatched=email_dispatched,
            password_setup_link=pwd_link if expose_links else None,
            email_verification_link=verify_link if expose_links else None,
        )

    @staticmethod
    async def sync_user_email_if_changed(
        db: AsyncSession,
        user: User,
        token_email: Optional[str],
        is_verified: bool,
    ) -> None:
        """
        Safely synchronize verified Firebase email to PostgreSQL using flush only.
        Rejects collisions with HTTP 409 and avoids premature transaction commits.
        """
        if not token_email or not is_verified or user.email.lower() == token_email.lower():
            return

        # Check whether target email belongs to another user
        collision = await db.scalar(
            select(User).where(func.lower(User.email) == token_email.lower(), User.id != user.id)
        )
        if collision:
            logger.warning(
                "Email sync conflict: user %s requested email %s already owned by user %s",
                user.id,
                token_email,
                collision.id,
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Verified Firebase email collides with an existing registered account. Email synchronization rejected.",
            )

        user.email = token_email
        await db.flush()

    @staticmethod
    async def list_users(
        db: AsyncSession,
        current_user: User,
        page: int = 1,
        page_size: int = 20,
        role_filter: Optional[UserRole] = None,
        search: Optional[str] = None,
    ) -> PaginatedResponse[UserResponse]:
        """
        List users with strict role isolation:
        - STAFF: restricted to role=customer only.
        - ADMIN: unrestricted access across all roles.
        """
        query = select(User)

        # Enforce role boundaries
        if current_user.role == UserRole.STAFF:
            if role_filter and role_filter != UserRole.CUSTOMER:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Staff members are restricted to viewing customer records only.",
                )
            query = query.where(User.role == UserRole.CUSTOMER)
        elif current_user.role == UserRole.ADMIN:
            if role_filter:
                query = query.where(User.role == role_filter)
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Customers are not permitted to list user accounts.",
            )

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    User.full_name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.company_name.ilike(search_pattern),
                )
            )

        # Calculate total
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.scalar(count_query) or 0

        # Apply pagination
        offset = (page - 1) * page_size
        results = await db.execute(query.order_by(User.created_at.desc()).offset(offset).limit(page_size))
        users = results.scalars().all()

        return PaginatedResponse(
            items=[UserResponse.model_validate(u) for u in users],
            total=total,
            page=page,
            page_size=page_size,
            pages=math.ceil(total / page_size) if page_size > 0 else 1,
        )


user_service = UserService()
