"""
Pytest configuration and fixtures for testing
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.team import Team
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.team_standing import TeamStanding  # noqa: F401
from app.models.game_player_spotlight import GamePlayerSpotlight  # noqa: F401
from app.core.security import get_password_hash
from uuid import uuid4
from datetime import datetime, timedelta

# Test database (in-memory SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def _clear_cache_fallback_after_test():
    """Avoid daily_prediction / rate-limit keys leaking between tests when using memory fallback."""
    yield
    from app.services.cache_service import clear_fallback_memory_store

    clear_fallback_memory_store()


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with database override"""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(
        id=uuid4(),
        email="test@example.com",
        password_hash=get_password_hash("testpass123"),
        subscription_tier="free"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def premium_user(db):
    """Create a premium test user"""
    user = User(
        id=uuid4(),
        email="premium@example.com",
        password_hash=get_password_hash("premium123"),
        subscription_tier="premium"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_teams(db):
    """Create test teams"""
    teams = [
        Team(
            id=uuid4(),
            name="Team A",
            league="nfl",
            abbreviation="TEA"
        ),
        Team(
            id=uuid4(),
            name="Team B",
            league="nfl",
            abbreviation="TEB"
        ),
    ]
    for team in teams:
        db.add(team)
    db.commit()
    return teams


@pytest.fixture
def test_game(db, test_teams):
    """Create a test game"""
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now() + timedelta(days=1),
        status="scheduled"
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@pytest.fixture
def test_prediction(db, test_game):
    """Create a test prediction"""
    prediction = Prediction(
        id=uuid4(),
        game_id=test_game.id,
        model_version="v1.0.0",
        home_win_probability=0.65,
        away_win_probability=0.35,
        expected_home_score=24.5,
        expected_away_score=21.2,
        confidence_level="high"
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


@pytest.fixture
def auth_headers(client, test_user):
    """Get authentication headers for test user"""
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user.email,
            "password": "testpass123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def premium_auth_headers(client, premium_user):
    """Get authentication headers for premium user"""
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": premium_user.email,
            "password": "premium123"
        }
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
