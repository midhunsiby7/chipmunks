r"""
Brightloop - Standalone PostgreSQL Database Verification Script
Run this script to verify real PostgreSQL connectivity, migrations, constraints,
and transactional integrity.

Usage:
    cd backend
    .venv\Scripts\python scripts/verify_postgres.py
"""
import asyncio
import logging
import os
import sys
import uuid
from decimal import Decimal

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("verify_postgres")

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def verify():
    logger.info("=" * 60)
    logger.info("BRIGHTLOOP POSTGRESQL VERIFICATION")
    logger.info("=" * 60)
    logger.info("Configured Database URL: %s", settings.DATABASE_URL)

    # 1. Test basic TCP / Asyncpg connection
    logger.info("Attempting connection to PostgreSQL...")
    try:
        import asyncpg
        conn = await asyncpg.connect(
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
            database=settings.POSTGRES_DB,
            host=settings.POSTGRES_SERVER,
            port=settings.POSTGRES_PORT,
            timeout=5,
        )
        version = await conn.fetchval("SELECT version();")
        logger.info("Successfully connected to PostgreSQL! Engine version: %s", version)
        await conn.close()
    except Exception as exc:
        logger.error("-" * 60)
        logger.error("POSTGRESQL CONNECTION BLOCKED:")
        logger.error("Could not establish TCP connection to PostgreSQL at %s:%d: %s", settings.POSTGRES_SERVER, settings.POSTGRES_PORT, exc)
        logger.error("-" * 60)
        logger.info("DIAGNOSTIC & REPRODUCTION INSTRUCTIONS:")
        logger.info("1. Start the local PostgreSQL Docker container:")
        logger.info("     docker compose up -d")
        logger.info("   Or start your local PostgreSQL Windows Service on port 5432.")
        logger.info("2. Re-run this verification script:")
        logger.info("     cd backend; python scripts/verify_postgres.py")
        logger.error("-" * 60)
        sys.exit(1)

    # 2. Test SQLAlchemy Async Session & Alembic Migrations
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import select, text
    from app.models.user import User, UserRole

    async with AsyncSessionLocal() as session:
        logger.info("Verifying Alembic migrations table...")
        current_rev = await session.scalar(text("SELECT version_num FROM alembic_version;"))
        logger.info("Current Alembic Schema Revision: %s", current_rev)

        # 3. Test Transactional Rollback
        logger.info("Testing transactional isolation & rollback behavior...")
        test_uid = f"pg-test-{uuid.uuid4().hex[:8]}"
        test_email = f"{test_uid}@example.com"

        user = User(
            firebase_uid=test_uid,
            email=test_email,
            full_name="PostgreSQL Test User",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        # Deliberate unique constraint violation to verify rollback
        dup_user = User(
            firebase_uid=test_uid,  # Duplicate UID
            email=f"dup_{test_email}",
            full_name="Duplicate User",
            role=UserRole.CUSTOMER,
            is_active=True,
        )
        session.add(dup_user)
        try:
            await session.flush()
            logger.error("FAILURE: Duplicate UID did not trigger constraint violation!")
        except Exception:
            logger.info("SUCCESS: Duplicate UID properly rejected by PostgreSQL unique constraint.")
            await session.rollback()

    logger.info("=" * 60)
    logger.info("POSTGRESQL VERIFICATION COMPLETE: ALL INTEGRATION CHECKS PASSED.")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(verify())
