"""Point-in-time feature vectors persisted at inference (I91)."""
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base, GUID


class GameFeatureSnapshot(Base):
    __tablename__ = "game_feature_snapshots"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    game_id = Column(GUID, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_id = Column(GUID, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True)
    captured_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    feature_source = Column(String(40), nullable=False)
    model_version = Column(String(50), nullable=True)
    features_json = Column(Text, nullable=False)

    game = relationship("Game", backref="feature_snapshots")
    prediction = relationship("Prediction", backref="feature_snapshots")
