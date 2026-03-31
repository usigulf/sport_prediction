"""
Game model
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class Game(Base):
    __tablename__ = "games"
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    league = Column(String(50), nullable=False, index=True)
    home_team_id = Column(GUID, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(GUID, ForeignKey("teams.id"), nullable=False)
    scheduled_time = Column(DateTime(timezone=True), nullable=False, index=True)
    status = Column(String(20), default="scheduled", nullable=False, index=True)
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    venue = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
