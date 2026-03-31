"""
User favorite (watchlist) model - teams and leagues
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base, GUID


class UserFavorite(Base):
    __tablename__ = "user_favorites"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(20), nullable=False)  # 'team' | 'league'
    entity_id = Column(String(100), nullable=False)   # team UUID or league code (e.g. 'nfl', 'nba')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="favorites")

    __table_args__ = (
        UniqueConstraint("user_id", "entity_type", "entity_id", name="uq_user_favorite_entity"),
    )
