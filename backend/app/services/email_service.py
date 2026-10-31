import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    """Raised when transactional email delivery fails."""
    pass


class EmailService:
    @staticmethod
    def is_configured() -> bool:
        """Check whether a transactional email provider is configured."""
        return bool(settings.SMTP_HOST)

    @classmethod
    def send_staff_onboarding_email(
        cls,
        to_email: str,
        full_name: str,
        password_setup_link: str,
        email_verification_link: str,
    ) -> bool:
        """
        Deliver staff onboarding credentials (password setup + email verification links).
        Returns True on successful delivery; raises EmailDeliveryError on failure.
        """
        if not cls.is_configured():
            if settings.APP_ENV == "production":
                raise EmailDeliveryError("Cannot send email: SMTP provider is not configured in production.")
            logger.info(
                "[DEV MODE EMAIL] To: %s | PwdLink: %s | VerifyLink: %s",
                to_email,
                password_setup_link,
                email_verification_link,
            )
            return False

        try:
            msg = EmailMessage()
            msg["Subject"] = f"Welcome to Brightloop - Set up your staff account"
            msg["From"] = settings.EMAILS_FROM_EMAIL
            msg["To"] = to_email

            body = (
                f"Hello {full_name},\n\n"
                f"You have been invited to join the Brightloop operations team.\n\n"
                f"1. Set your password here:\n{password_setup_link}\n\n"
                f"2. Verify your corporate email address here:\n{email_verification_link}\n\n"
                f"Welcome aboard,\nBrightloop Team"
            )
            msg.set_content(body)

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_PORT == 587:
                    server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            logger.info("Successfully delivered staff onboarding email to %s", to_email)
            return True
        except Exception as exc:
            logger.error("Failed to deliver staff onboarding email to %s: %s", to_email, exc)
            raise EmailDeliveryError(f"Email delivery failed: {exc}") from exc


email_service = EmailService()
