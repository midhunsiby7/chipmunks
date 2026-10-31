import asyncio
from datetime import datetime, timezone
import logging
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole
from app.schemas.invoice import RecurringBillingGenerateRequest
from app.services.invoice_service import invoice_service

logger = logging.getLogger("billing_scheduler")


class BillingScheduler:
    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._is_running: bool = False

    @property
    def is_running(self) -> bool:
        return self._is_running

    def start(self) -> None:
        """Starts the recurring billing background scheduler loop."""
        if not settings.BILLING_SCHEDULER_ENABLED:
            logger.info("Billing scheduler is disabled via configuration.")
            return

        if self._is_running:
            logger.warning("Billing scheduler is already running.")
            return

        self._is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(
            "Billing scheduler started. Interval: %d seconds.",
            settings.BILLING_SCHEDULER_INTERVAL_SECONDS,
        )

    async def stop(self) -> None:
        """Gracefully terminates the recurring billing background scheduler loop."""
        if not self._is_running:
            return

        self._is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("Billing scheduler stopped cleanly.")

    async def run_scheduler_cycle(self, session: Optional[AsyncSession] = None) -> dict:
        """
        Executes a single billing and invoice reconciliation cycle.
        Safe to call repeatedly and concurrently.
        """
        logger.info("Starting automated billing cycle...")
        if session:
            return await self._execute_cycle_with_session(session)

        async with AsyncSessionLocal() as s:
            return await self._execute_cycle_with_session(s)

    async def _execute_cycle_with_session(self, session: AsyncSession) -> dict:
        try:
            # 1. Transition past-due invoices to OVERDUE
            overdue_count = await invoice_service.update_overdue_invoices(session)

            # 2. Retrieve system admin for authorization context
            system_admin = await session.scalar(
                select(User).where(User.role == UserRole.ADMIN, User.is_active == True)
            )
            if not system_admin:
                # Ephemeral system identity for background recurring execution
                system_admin = User(
                    id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
                    firebase_uid="system-billing-scheduler",
                    email="system.scheduler@brightloop.local",
                    full_name="Brightloop System Scheduler",
                    role=UserRole.ADMIN,
                    is_active=True,
                )

            # 3. Generate recurring invoices
            now = datetime.now(timezone.utc)
            req = RecurringBillingGenerateRequest(target_date=now)
            resp = await invoice_service.generate_recurring_invoices(
                db=session, current_user=system_admin, data=req
            )

            logger.info(
                "Billing cycle finished: %d overdue transitioned, %d recurring invoices generated, %d skipped.",
                overdue_count,
                resp.invoices_generated,
                resp.skipped_count,
            )
            return {
                "status": "success",
                "overdue_updated": overdue_count,
                "invoices_generated": resp.invoices_generated,
                "skipped_count": resp.skipped_count,
                "timestamp": now.isoformat(),
            }
        except Exception as exc:
            logger.error("Error during automated billing cycle: %s", exc, exc_info=True)
            return {"status": "error", "error": str(exc)}


    async def _run_loop(self) -> None:
        """Internal worker loop executing cycles at configured intervals."""
        while self._is_running:
            try:
                await self.run_scheduler_cycle()
                interval = max(5, settings.BILLING_SCHEDULER_INTERVAL_SECONDS)
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Unexpected error in billing scheduler loop: %s", exc, exc_info=True)
                await asyncio.sleep(10)


billing_scheduler = BillingScheduler()
