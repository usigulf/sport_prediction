"""
User push token for Expo Push Notifications (and future FCM).
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class UserPushToken(Base):
    __tablename__ = "user_push_tokens"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(256), nullable=False, index=True)
    platform = Column(String(20), default="expo")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="push_tokens")

    __table_args__ = (
        UniqueConstraint("user_id", "token", name="uq_user_push_token"),
    )
