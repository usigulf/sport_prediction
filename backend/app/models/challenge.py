"""
Challenge: user creates a challenge with N games; we resolve when all games are finished (model correct count).
"""
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.sql import func
import uuid
import json
from app.database import Base, GUID


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    creator_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_ids = Column(Text, nullable=False)  # JSON array of game UUID strings
    status = Column(String(20), default="active", nullable=False, index=True)  # active | completed
    correct_count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    def get_game_ids_list(self):
        if not self.game_ids:
            return []
        try:
            return json.loads(self.game_ids)
        except (TypeError, ValueError):
            return []

    def set_game_ids_list(self, ids):
        self.game_ids = json.dumps([str(i) for i in ids])
