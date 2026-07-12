"""Append-only forecast ledger entries (auditable issued picks)."""
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship
import uuid

from app.database import Base, GUID


class ForecastLedgerEntry(Base):
    __tablename__ = "forecast_ledger_entries"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    game_id = Column(GUID, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_id = Column(
        GUID, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    sequence = Column(BigInteger, nullable=False, unique=True)
    issued_at = Column(DateTime(timezone=True), nullable=False, index=True)
    wall_clock_at = Column(DateTime(timezone=True), nullable=False)
    kickoff_at = Column(DateTime(timezone=True), nullable=True)
    league = Column(String(64), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    prediction_source = Column(String(32), nullable=False)
    prediction_type = Column(String(20), nullable=True)
    home_win_probability = Column(Numeric(5, 4), nullable=False)
    away_win_probability = Column(Numeric(5, 4), nullable=False)
    expected_home_score = Column(Numeric(5, 2), nullable=True)
    expected_away_score = Column(Numeric(5, 2), nullable=True)
    confidence_level = Column(String(20), nullable=True)
    feature_source = Column(String(40), nullable=True)
    content_hash = Column(String(64), nullable=False, unique=True)
    prev_content_hash = Column(String(64), nullable=True)

    game = relationship("Game", backref="forecast_ledger_entries")
    prediction = relationship("Prediction", backref="forecast_ledger_entries")
