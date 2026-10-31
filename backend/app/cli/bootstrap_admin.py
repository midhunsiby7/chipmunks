import argparse
import asyncio
import logging
import sys
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.firebase import get_firebase_user
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("bootstrap_admin")

BOOTSTRAP_ADVISORY_LOCK_ID = 42424242


async def run_bootstrap(firebase_uid: str, email: str, full_name: str) -> None:
    """
    Bootstrap the initial administrator account with atomic database locking
    and strict Firebase identity verification.
    """
    logger.info("Starting initial administrator bootstrap...")

    async with AsyncSessionLocal() as session:
        # Step 1: Open transaction and acquire PostgreSQL advisory transaction lock
        # In SQLite (during unit testing), pg_advisory_xact_lock is skipped or handled safely
        bind = session.bind
        dialect_name = bind.dialect.name if bind else ""
        if dialect_name == "postgresql":
            await session.execute(
                text("SELECT pg_advisory_xact_lock(:lock_id)"),
                {"lock_id": BOOTSTRAP_ADVISORY_LOCK_ID},
            )
            logger.info("Acquired PostgreSQL advisory transaction lock (%s).", BOOTSTRAP_ADVISORY_LOCK_ID)

        # Step 2: Check active administrator existence under lock
        active_admin_count = await session.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.ADMIN, User.is_active == True)
        )
        if active_admin_count and active_admin_count > 0:
            logger.error("An active administrator already exists in the system. Bootstrap is locked.")
            sys.exit(1)

        # Step 3: Verify Firebase account exists and matches
        try:
            fb_user = get_firebase_user(firebase_uid)
        except Exception as exc:
            logger.error("Firebase UID '%s' not found in Firebase Authentication: %s", firebase_uid, exc)
            sys.exit(1)

        if not fb_user.email or fb_user.email.lower() != email.lower():
            logger.error(
                "Firebase email mismatch: Firebase account has '%s', but supplied '%s'.",
                fb_user.email,
                email,
            )
            sys.exit(1)

        if fb_user.email_verified is not True:
            logger.error(
                "Firebase account '%s' is not verified (email_verified=False). "
                "The initial administrator must have a verified email.",
                email,
            )
            sys.exit(1)

        # Step 4: Check if email already exists under a different role/UID
        existing_email_user = await session.scalar(select(User).where(User.email == email))
        if existing_email_user:
            logger.error("A user record with email '%s' already exists in PostgreSQL.", email)
            sys.exit(1)

        # Step 5: Insert and commit administrator record
        admin_user = User(
            firebase_uid=firebase_uid,
            email=email,
            full_name=full_name,
            role=UserRole.ADMIN,
            is_active=True,
            company_name="Brightloop System Administrator",
        )
        session.add(admin_user)

        try:
            await session.commit()
            logger.info(
                "SUCCESS: Initial administrator '%s' (UID: %s) bootstrapped successfully with ID: %s",
                email,
                firebase_uid,
                admin_user.id,
            )
        except Exception as exc:
            await session.rollback()
            logger.error("Failed to commit initial administrator record: %s", exc)
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Bootstrap the initial Brightloop administrator account."
    )
    parser.add_argument("--firebase-uid", required=True, help="Verified Firebase User UID")
    parser.add_argument("--email", required=True, help="Administrator email address")
    parser.add_argument("--full-name", required=True, help="Administrator full name")

    args = parser.parse_args()

    asyncio.run(
        run_bootstrap(
            firebase_uid=args.firebase_uid.strip(),
            email=args.email.strip(),
            full_name=args.full_name.strip(),
        )
    )


if __name__ == "__main__":
    main()
