"""
Prediction model
"""
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    game_id = Column(GUID, ForeignKey("games.id"), nullable=False, index=True)
    model_version = Column(String(50), nullable=False)
    home_win_probability = Column(Numeric(5, 4), nullable=False)
    away_win_probability = Column(Numeric(5, 4), nullable=False)
    expected_home_score = Column(Numeric(5, 2))
    expected_away_score = Column(Numeric(5, 2))
    confidence_level = Column(String(20))
    rich_analysis = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    game = relationship("Game", backref="predictions")
    
    __table_args__ = (
        UniqueConstraint('game_id', 'model_version', 'created_at', name='uq_prediction_game_model_time'),
    )
