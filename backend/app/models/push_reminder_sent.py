"""
Tracks push reminders we've already sent so we don't spam (e.g. one "game starting in 1h" per user per game).
"""
from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class PushReminderSent(Base):
    __tablename__ = "push_reminder_sent"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(GUID, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    reminder_type = Column(String(50), nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "game_id", "reminder_type", name="uq_push_reminder_user_game_type"),
    )
