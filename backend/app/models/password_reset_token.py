"""
Single-use password reset tokens (hashed at rest).
"""
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base, GUID


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="password_reset_tokens")
