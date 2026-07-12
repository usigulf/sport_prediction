"""Persisted provider sync / error events for data telemetry (audit #13)."""
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
import uuid

from app.database import Base, GUID


class ProviderSyncEvent(Base):
    __tablename__ = "provider_sync_events"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    provider = Column(String(40), nullable=False, index=True)
    job = Column(String(64), nullable=False, index=True)
    league = Column(String(64), nullable=True, index=True)
    ok = Column(Boolean, nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), nullable=False, index=True)
    finished_at = Column(DateTime(timezone=True), nullable=False)
    duration_ms = Column(Integer, nullable=True)
    rows_touched = Column(Integer, nullable=True)
    error_code = Column(String(64), nullable=True)
    error_detail = Column(Text, nullable=True)
