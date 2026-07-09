"""Historical market odds snapshots for line movement (I62) and CLV (I63)."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base, GUID


class OddsSnapshot(Base):
    __tablename__ = "odds_snapshots"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    game_id = Column(GUID, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    captured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    provider = Column(String(50), nullable=True)
    home_moneyline = Column(Integer, nullable=True)
    away_moneyline = Column(Integer, nullable=True)
    home_implied_prob = Column(Numeric(5, 4), nullable=True)
    away_implied_prob = Column(Numeric(5, 4), nullable=True)
    spread_home = Column(Numeric(5, 2), nullable=True)
    total_points = Column(Numeric(5, 2), nullable=True)

    game = relationship("Game", backref="odds_snapshots")
