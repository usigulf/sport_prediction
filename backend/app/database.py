"""
Database configuration and session management
"""
import uuid
from sqlalchemy import create_engine, String
from sqlalchemy.engine import Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import TypeDecorator
from app.config import get_settings

settings = get_settings()

# UUID stored as string (works on SQLite and PostgreSQL)
class GUID(TypeDecorator):
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value) if value else None

def _make_engine() -> Engine:
    url = settings.database_url
    opts = {"pool_pre_ping": True, "echo": False}
    if url.startswith("sqlite"):
        opts["connect_args"] = {"check_same_thread": False}
        # SQLite doesn't use pool_size
        return create_engine(url, **opts)
    opts["pool_size"] = settings.database_pool_size
    opts["max_overflow"] = settings.database_max_overflow
    return create_engine(url, **opts)

engine = _make_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_sqlite_tables():
    """Create tables for SQLite (dev); no-op for PostgreSQL (use Alembic)."""
    if not settings.database_url.startswith("sqlite"):
        return
    from app.models import user, user_favorite, user_prediction_view, user_push_token, push_reminder_sent, team, game, prediction, challenge  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
