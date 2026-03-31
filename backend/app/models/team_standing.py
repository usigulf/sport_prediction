"""
League table snapshot per team (synced from provider or manual seed).
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class TeamStanding(Base):
    __tablename__ = "team_standings"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    league = Column(String(50), nullable=False, index=True)
    team_id = Column(GUID, ForeignKey("teams.id"), nullable=False, index=True)
    league_rank = Column(Integer, nullable=False)
    played = Column(Integer, nullable=False, default=0)
    wins = Column(Integer, nullable=False, default=0)
    draws = Column(Integer, nullable=False, default=0)
    losses = Column(Integer, nullable=False, default=0)
    points = Column(Integer, nullable=True)
    goals_for = Column(Integer, nullable=True)
    goals_against = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("league", "team_id", name="uq_standing_league_team"),)
