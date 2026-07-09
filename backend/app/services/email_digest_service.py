"""Daily email digest of top picks (Imp #67). Requires SMTP env vars."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.services.feature_flags import is_enabled

logger = logging.getLogger(__name__)


def _smtp_configured() -> bool:
    s = get_settings()
    return bool((s.smtp_host or "").strip() and (s.smtp_from_email or "").strip())


def build_daily_digest_text(db: Session, limit: int = 5) -> str:
    now = datetime.now(timezone.utc)
    preds = (
        db.query(Prediction)
        .join(Game)
        .options(joinedload(Prediction.game).joinedload(Game.home_team))
        .options(joinedload(Prediction.game).joinedload(Game.away_team))
        .filter(Game.status == "scheduled", Game.scheduled_time >= now.replace(tzinfo=None))
        .order_by(Prediction.confidence_level.desc())
        .limit(limit)
        .all()
    )
    lines = ["Today's top octobetiQ picks (informational — not betting advice):", ""]
    for p in preds:
        g = p.game
        if not g:
            continue
        home = g.home_team.name if g.home_team else "Home"
        away = g.away_team.name if g.away_team else "Away"
        hp = round(float(p.home_win_probability) * 100)
        lines.append(f"• {home} vs {away} — home win {hp}% ({p.confidence_level})")
    if len(lines) <= 2:
        lines.append("No upcoming high-confidence picks today.")
    lines.append("")
    lines.append("Manage notifications in the octobetiQ app.")
    return "\n".join(lines)


def send_daily_digest_to_user(db: Session, user: User, body: str) -> bool:
    if not _smtp_configured():
        return False
    settings = get_settings()
    msg = EmailMessage()
    msg["Subject"] = "Your octobetiQ daily picks"
    msg["From"] = settings.smtp_from_email
    msg["To"] = user.email
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587, timeout=30) as smtp:
            if settings.smtp_username and settings.smtp_password:
                smtp.starttls()
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(msg)
        return True
    except Exception:
        logger.warning("Email digest send failed for %s", user.email, exc_info=True)
        return False


def run_daily_email_digest(db: Session) -> int:
    """Send digest to premium users when FEATURE_EMAIL_DIGEST=true and SMTP configured."""
    if not is_enabled("email_digest"):
        return 0
    if not _smtp_configured():
        logger.info("Email digest skipped — SMTP not configured")
        return 0
    body = build_daily_digest_text(db)
    users = (
        db.query(User)
        .filter(User.subscription_tier.in_(("premium", "premium_plus", "trialing")))
        .limit(5000)
        .all()
    )
    sent = 0
    for user in users:
        if send_daily_digest_to_user(db, user, body):
            sent += 1
    return sent
