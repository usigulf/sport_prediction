"""User-submitted picks for calibration tracking (I92)."""
from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base, GUID


class UserPick(Base):
    __tablename__ = "user_picks"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(GUID, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    outcome = Column(String(10), nullable=False)  # home | away | draw
    probability = Column(Numeric(5, 4), nullable=False)
    market_home_implied_prob = Column(Numeric(5, 4), nullable=True)
    market_away_implied_prob = Column(Numeric(5, 4), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="picks")
    game = relationship("Game", backref="user_picks")

    __table_args__ = (
        UniqueConstraint("user_id", "game_id", name="uq_user_pick_user_game"),
    )
