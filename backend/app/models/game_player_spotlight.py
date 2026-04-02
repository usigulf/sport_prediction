"""Optional per-game player / performer blurbs (sync from provider or admin)."""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class GamePlayerSpotlight(Base):
    __tablename__ = "game_player_spotlights"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    game_id = Column(GUID, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    player_name = Column(String(255), nullable=False)
    team_name = Column(String(255), nullable=False)
    role = Column(String(120), nullable=True)
    summary = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
