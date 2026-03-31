"""
Team model
"""
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class Team(Base):
    __tablename__ = "teams"
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    league = Column(String(50), nullable=False, index=True)
    abbreviation = Column(String(10))
    logo_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
