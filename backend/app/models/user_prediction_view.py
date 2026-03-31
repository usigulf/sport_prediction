"""
User prediction view - tracks when a user views a prediction (for history).
"""
from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class UserPredictionView(Base):
    __tablename__ = "user_prediction_views"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(GUID, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    prediction_id = Column(GUID, ForeignKey("predictions.id", ondelete="SET NULL"), nullable=True, index=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="prediction_views")
    game = relationship("Game", backref="user_prediction_views")
    prediction = relationship("Prediction", backref="user_views")
