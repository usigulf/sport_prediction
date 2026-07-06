"""
Password reset token lifecycle.
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.security import get_password_hash
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services.email_service import send_password_reset_email

logger = logging.getLogger(__name__)
settings = get_settings()

FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, password reset instructions have been sent."
)


class PasswordResetError(Exception):
    """Raised when a reset token is invalid or expired."""


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _build_reset_url(raw_token: str) -> str:
    base = (settings.password_reset_link_base or "").strip().rstrip("/")
    if not base:
        base = "com.sportsprediction.app://reset-password"
    separator = "&" if "?" in base else "?"
    return f"{base}{separator}token={raw_token}"


def request_password_reset(db: Session, email: str) -> None:
    """Create a single-use token and email reset instructions when SMTP is configured."""
    normalized = email.strip().lower()
    user = db.query(User).filter(User.email == normalized).first()
    if not user:
        return

    now = datetime.now(timezone.utc)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now}, synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=settings.password_reset_token_expire_minutes)
    row = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(raw_token),
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()

    reset_url = _build_reset_url(raw_token)
    sent = send_password_reset_email(to_email=user.email, reset_url=reset_url)
    if not sent:
        logger.info("Password reset token created for user_id=%s", user.id)


def reset_password_with_token(db: Session, raw_token: str, new_password: str) -> User:
    """Validate token, set a new password, and mark the token used."""
    token = (raw_token or "").strip()
    if not token:
        raise PasswordResetError("Invalid or expired reset token")

    now = datetime.now(timezone.utc)
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == _hash_token(token),
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )
    if not row:
        raise PasswordResetError("Invalid or expired reset token")

    user = db.query(User).filter(User.id == row.user_id).first()
    if not user:
        raise PasswordResetError("Invalid or expired reset token")

    user.password_hash = get_password_hash(new_password)
    row.used_at = now
    db.commit()
    db.refresh(user)
    return user
