"""
Optional SMTP email delivery for transactional messages.
"""
import logging
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _smtp_configured() -> bool:
    return bool(
        (settings.smtp_host or "").strip()
        and (settings.smtp_from_email or "").strip()
    )


def send_password_reset_email(*, to_email: str, reset_url: str) -> bool:
    """Send reset instructions. Returns True when an email was sent."""
    if not _smtp_configured():
        logger.info(
            "Password reset email not sent (SMTP not configured) for %s. Reset URL: %s",
            to_email,
            reset_url,
        )
        return False

    msg = EmailMessage()
    msg["Subject"] = "Reset your OctobetiQ password"
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email
    msg.set_content(
        "We received a request to reset your OctobetiQ password.\n\n"
        f"Open this link on your device to choose a new password:\n{reset_url}\n\n"
        "This link expires in one hour. If you did not request a reset, you can ignore this email.\n"
    )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            username = (settings.smtp_username or "").strip()
            password: Optional[str] = settings.smtp_password
            if username and password:
                smtp.login(username, password)
            smtp.send_message(msg)
        return True
    except Exception:
        logger.exception("Failed to send password reset email to %s", to_email)
        return False
