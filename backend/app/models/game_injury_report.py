"""Structured injury reports per game (I97)."""
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base, GUID


class GameInjuryReport(Base):
    __tablename__ = "game_injury_reports"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    game_id = Column(GUID, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    player_name = Column(String(255), nullable=False)
    team_name = Column(String(255), nullable=False)
    status = Column(String(40), nullable=False, default="out")  # out | doubtful | questionable
    detail = Column(Text, nullable=True)
    source = Column(String(80), nullable=True)
    reported_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    game = relationship("Game", backref="injury_reports")
