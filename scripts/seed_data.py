"""
Database seed script for development and testing.
Populates database with sample teams, games, predictions, and team_standings.

Run (dependencies required: SQLAlchemy, etc.):
  From repo root on a host with backend/.env (DATABASE_URL):
    python3 -m venv .venv && . .venv/bin/activate
    pip install -r backend/requirements.txt
    set -a && . backend/.env && set +a && python scripts/seed_data.py

  Or inside the API container (recommended on servers):
    docker compose exec api python /app/scripts/seed_data.py

  Non-interactive full reseed (no y/n prompt):
    SEED_AUTO_YES=1 docker compose exec -e SEED_AUTO_YES=1 api python /app/scripts/seed_data.py
"""
import sys
import os
from datetime import datetime, timedelta
from uuid import uuid4

# Repo root + backend (so `python scripts/seed_data.py` from project root works)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_SCRIPT_DIR)
_BACKEND = os.path.join(_ROOT, "backend")
if os.path.isdir(os.path.join(_BACKEND, "app")):
    sys.path.insert(0, _BACKEND)
sys.path.insert(0, _ROOT)

from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import SessionLocal, engine, Base
from app.models.team import Team
from app.models.team_standing import TeamStanding  # noqa: F401 — register with Base
from app.models.game_player_spotlight import GamePlayerSpotlight  # noqa: F401 — register with Base
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.core.security import get_password_hash
from app.utils.team_logo_urls import default_team_logo_url

def create_teams(db: Session):
    """Create sample teams for different leagues"""
    teams_data = [
        # NFL Teams
        {"name": "Kansas City Chiefs", "league": "nfl", "abbreviation": "KC"},
        {"name": "Buffalo Bills", "league": "nfl", "abbreviation": "BUF"},
        {"name": "San Francisco 49ers", "league": "nfl", "abbreviation": "SF"},
        {"name": "Dallas Cowboys", "league": "nfl", "abbreviation": "DAL"},
        {"name": "Philadelphia Eagles", "league": "nfl", "abbreviation": "PHI"},
        {"name": "Miami Dolphins", "league": "nfl", "abbreviation": "MIA"},
        
        # NBA Teams
        {"name": "Los Angeles Lakers", "league": "nba", "abbreviation": "LAL"},
        {"name": "Boston Celtics", "league": "nba", "abbreviation": "BOS"},
        {"name": "Golden State Warriors", "league": "nba", "abbreviation": "GSW"},
        {"name": "Milwaukee Bucks", "league": "nba", "abbreviation": "MIL"},
        {"name": "Denver Nuggets", "league": "nba", "abbreviation": "DEN"},
        {"name": "Phoenix Suns", "league": "nba", "abbreviation": "PHX"},
        
        # Premier League Teams
        {"name": "Manchester City", "league": "premier_league", "abbreviation": "MCI"},
        {"name": "Arsenal", "league": "premier_league", "abbreviation": "ARS"},
        {"name": "Liverpool", "league": "premier_league", "abbreviation": "LIV"},
        {"name": "Manchester United", "league": "premier_league", "abbreviation": "MUN"},
        {"name": "Chelsea", "league": "premier_league", "abbreviation": "CHE"},
        {"name": "Tottenham Hotspur", "league": "premier_league", "abbreviation": "TOT"},
        # Champions League Teams
        {"name": "Real Madrid", "league": "champions_league", "abbreviation": "RMA"},
        {"name": "Barcelona", "league": "champions_league", "abbreviation": "BAR"},
        {"name": "Bayern Munich", "league": "champions_league", "abbreviation": "BAY"},
        {"name": "Paris Saint-Germain", "league": "champions_league", "abbreviation": "PSG"},
        {"name": "Manchester City", "league": "champions_league", "abbreviation": "MCI"},
        {"name": "Inter Milan", "league": "champions_league", "abbreviation": "INT"},
        # La Liga
        {"name": "Atlético Madrid", "league": "la_liga", "abbreviation": "ATM"},
        {"name": "Sevilla", "league": "la_liga", "abbreviation": "SEV"},
        {"name": "Real Sociedad", "league": "la_liga", "abbreviation": "RSO"},
        {"name": "Villarreal", "league": "la_liga", "abbreviation": "VIL"},
        {"name": "Athletic Club", "league": "la_liga", "abbreviation": "ATH"},
        {"name": "Real Betis", "league": "la_liga", "abbreviation": "BET"},
        # Serie A
        {"name": "Juventus", "league": "serie_a", "abbreviation": "JUV"},
        {"name": "AC Milan", "league": "serie_a", "abbreviation": "MIL"},
        {"name": "Napoli", "league": "serie_a", "abbreviation": "NAP"},
        {"name": "Roma", "league": "serie_a", "abbreviation": "ROM"},
        {"name": "Lazio", "league": "serie_a", "abbreviation": "LAZ"},
        {"name": "Fiorentina", "league": "serie_a", "abbreviation": "FIO"},
        # Bundesliga
        {"name": "Borussia Dortmund", "league": "bundesliga", "abbreviation": "BVB"},
        {"name": "RB Leipzig", "league": "bundesliga", "abbreviation": "RBL"},
        {"name": "Bayer Leverkusen", "league": "bundesliga", "abbreviation": "B04"},
        {"name": "Eintracht Frankfurt", "league": "bundesliga", "abbreviation": "SGE"},
        {"name": "VfB Stuttgart", "league": "bundesliga", "abbreviation": "VFB"},
        {"name": "VfL Wolfsburg", "league": "bundesliga", "abbreviation": "WOB"},
        # MLS
        {"name": "Los Angeles FC", "league": "mls", "abbreviation": "LAFC"},
        {"name": "Inter Miami CF", "league": "mls", "abbreviation": "MIA"},
        {"name": "Columbus Crew", "league": "mls", "abbreviation": "CLB"},
        {"name": "Seattle Sounders FC", "league": "mls", "abbreviation": "SEA"},
        {"name": "Atlanta United FC", "league": "mls", "abbreviation": "ATL"},
        {"name": "New York City FC", "league": "mls", "abbreviation": "NYC"},
    ]
    
    teams = []
    for team_data in teams_data:
        team = Team(
            id=uuid4(),
            name=team_data["name"],
            league=team_data["league"],
            abbreviation=team_data["abbreviation"],
            logo_url=default_team_logo_url(team_data["league"], team_data["abbreviation"]),
        )
        db.add(team)
        teams.append(team)
    
    db.commit()
    print(f"Created {len(teams)} teams")
    return teams

def create_games(db: Session, teams: list):
    """Create sample upcoming games"""
    # Filter teams by league
    nfl_teams = [t for t in teams if t.league == "nfl"]
    nba_teams = [t for t in teams if t.league == "nba"]
    pl_teams = [t for t in teams if t.league == "premier_league"]
    cl_teams = [t for t in teams if t.league == "champions_league"]
    la_teams = [t for t in teams if t.league == "la_liga"]
    sa_teams = [t for t in teams if t.league == "serie_a"]
    bun_teams = [t for t in teams if t.league == "bundesliga"]
    mls_teams = [t for t in teams if t.league == "mls"]

    games = []
    now = datetime.now()

    # NFL Games (next 7 days)
    for i in range(5):
        game_date = now + timedelta(days=i+1, hours=20)  # Evening games
        home_team = nfl_teams[i % len(nfl_teams)]
        away_team = nfl_teams[(i+1) % len(nfl_teams)]
        
        game = Game(
            id=uuid4(),
            league="nfl",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)
    
    # NBA Games
    for i in range(5):
        game_date = now + timedelta(days=i+1, hours=19)
        home_team = nba_teams[i % len(nba_teams)]
        away_team = nba_teams[(i+2) % len(nba_teams)]
        
        game = Game(
            id=uuid4(),
            league="nba",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)
    
    # Premier League Games
    for i in range(5):
        game_date = now + timedelta(days=i+2, hours=15)
        home_team = pl_teams[i % len(pl_teams)]
        away_team = pl_teams[(i+1) % len(pl_teams)]
        game = Game(
            id=uuid4(),
            league="premier_league",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)

    # Champions League Games
    for i in range(4):
        game_date = now + timedelta(days=i+3, hours=15)
        home_team = cl_teams[i % len(cl_teams)]
        away_team = cl_teams[(i+1) % len(cl_teams)]
        game = Game(
            id=uuid4(),
            league="champions_league",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)

    # La Liga
    for i in range(4):
        game_date = now + timedelta(days=i + 2, hours=16)
        home_team = la_teams[i % len(la_teams)]
        away_team = la_teams[(i + 1) % len(la_teams)]
        game = Game(
            id=uuid4(),
            league="la_liga",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled",
        )
        db.add(game)
        games.append(game)

    # Serie A
    for i in range(4):
        game_date = now + timedelta(days=i + 3, hours=17)
        home_team = sa_teams[i % len(sa_teams)]
        away_team = sa_teams[(i + 2) % len(sa_teams)]
        game = Game(
            id=uuid4(),
            league="serie_a",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled",
        )
        db.add(game)
        games.append(game)

    # Bundesliga
    for i in range(4):
        game_date = now + timedelta(days=i + 2, hours=18)
        home_team = bun_teams[i % len(bun_teams)]
        away_team = bun_teams[(i + 1) % len(bun_teams)]
        game = Game(
            id=uuid4(),
            league="bundesliga",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled",
        )
        db.add(game)
        games.append(game)

    # MLS
    for i in range(4):
        game_date = now + timedelta(days=i + 1, hours=23)
        home_team = mls_teams[i % len(mls_teams)]
        away_team = mls_teams[(i + 3) % len(mls_teams)]
        game = Game(
            id=uuid4(),
            league="mls",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled",
        )
        db.add(game)
        games.append(game)

    # Create some finished games for historical data
    import random

    for i in range(10):
        game_date = now - timedelta(days=i + 1)
        home_team = nfl_teams[i % len(nfl_teams)]
        away_team = nfl_teams[(i + 1) % len(nfl_teams)]

        home_score = random.randint(14, 35)
        away_score = random.randint(7, 28)

        game = Game(
            id=uuid4(),
            league="nfl",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="finished",
            home_score=home_score,
            away_score=away_score,
        )
        db.add(game)
        games.append(game)

    # Repeat H2H: same two teams, multiple finished games (powers analysis "Head-to-head history")
    if len(nfl_teams) >= 2:
        a, b = nfl_teams[0], nfl_teams[1]
        for i in range(5):
            game_date = now - timedelta(days=40 + i * 14)
            if i % 2 == 0:
                hid, aid = a.id, b.id
                hs, aws = random.randint(17, 31), random.randint(10, 27)
            else:
                hid, aid = b.id, a.id
                hs, aws = random.randint(14, 28), random.randint(17, 30)
            game = Game(
                id=uuid4(),
                league="nfl",
                home_team_id=hid,
                away_team_id=aid,
                scheduled_time=game_date,
                status="finished",
                home_score=hs,
                away_score=aws,
            )
            db.add(game)
            games.append(game)

    db.commit()
    print(f"Created {len(games)} games")
    return games

def create_predictions(db: Session, games: list):
    """Create sample predictions for upcoming games"""
    import random
    
    predictions = []
    model_version = "v1.0.0"
    
    for game in games:
        if game.status != "scheduled":
            continue
        
        # Generate realistic probabilities
        # Home team slightly favored (55-65% win probability)
        home_win_prob = round(random.uniform(0.45, 0.65), 4)
        away_win_prob = round(1 - home_win_prob, 4)
        
        # Determine confidence level
        if home_win_prob >= 0.70 or home_win_prob <= 0.30:
            confidence = "high"
        elif home_win_prob >= 0.55 or home_win_prob <= 0.45:
            confidence = "medium"
        else:
            confidence = "low"
        
        # Generate expected scores (league-specific)
        if game.league == "nfl":
            expected_home_score = round(random.uniform(20, 28), 1)
            expected_away_score = round(random.uniform(17, 25), 1)
        elif game.league == "nba":
            expected_home_score = round(random.uniform(105, 115), 1)
            expected_away_score = round(random.uniform(100, 110), 1)
        else:  # Soccer competitions
            expected_home_score = round(random.uniform(1.5, 2.5), 1)
            expected_away_score = round(random.uniform(1.0, 2.0), 1)
        
        prediction = Prediction(
            id=uuid4(),
            game_id=game.id,
            model_version=model_version,
            home_win_probability=home_win_prob,
            away_win_probability=away_win_prob,
            expected_home_score=expected_home_score,
            expected_away_score=expected_away_score,
            confidence_level=confidence
        )
        db.add(prediction)
        predictions.append(prediction)
    
    db.commit()
    print(f"Created {len(predictions)} predictions")
    return predictions


def create_player_spotlights_demo(db: Session, games: list):
    """Two placeholder spotlight rows on the first scheduled game so structured analysis shows the performers block."""
    scheduled = [g for g in games if getattr(g, "status", None) == "scheduled"]
    if not scheduled:
        return []
    g0 = scheduled[0]
    home = db.query(Team).filter(Team.id == g0.home_team_id).first()
    away = db.query(Team).filter(Team.id == g0.away_team_id).first()
    if not home or not away:
        return []
    rows = [
        GamePlayerSpotlight(
            id=uuid4(),
            game_id=g0.id,
            player_name=f"{home.abbreviation} key contributor",
            team_name=home.name,
            role="Matchup note",
            summary=(
                "Demo row — replace with real usage, injury, and recent form from your stats provider."
            ),
            sort_order=0,
        ),
        GamePlayerSpotlight(
            id=uuid4(),
            game_id=g0.id,
            player_name=f"{away.abbreviation} key contributor",
            team_name=away.name,
            role="Matchup note",
            summary=(
                "Demo row — replace with real usage, injury, and recent form from your stats provider."
            ),
            sort_order=1,
        ),
    ]
    for r in rows:
        db.add(r)
    db.commit()
    print(f"Created {len(rows)} game_player_spotlights (demo on game {g0.id})")
    return rows


def create_team_standings(db: Session, teams: list):
    """Placeholder league tables so full analysis can show standings (replace with API sync later)."""
    from collections import defaultdict

    played_by_league = {
        "nfl": 17,
        "nba": 82,
        "premier_league": 38,
        "champions_league": 6,
        "la_liga": 38,
        "serie_a": 38,
        "bundesliga": 34,
        "mls": 34,
    }
    by_league = defaultdict(list)
    for t in teams:
        by_league[t.league].append(t)

    rows = []
    for league, tlist in by_league.items():
        tlist.sort(key=lambda x: x.name)
        n = len(tlist)
        played = played_by_league.get(league, 34)
        for league_rank, team in enumerate(tlist, start=1):
            wins = max(0, min(played, played - league_rank - 1))
            if league in ("premier_league", "champions_league"):
                draws = max(0, min(8, (n - league_rank) % 6))
                losses = max(0, played - wins - draws)
                points = 3 * wins + draws
            else:
                draws = 0
                losses = max(0, played - wins)
                points = None
            gf = 200 + (n - league_rank) * 8 + (hash(str(team.id)) % 25)
            ga = 180 + league_rank * 6 + (hash(str(team.id)) % 40)
            st = TeamStanding(
                id=uuid4(),
                league=league,
                team_id=team.id,
                league_rank=league_rank,
                played=played,
                wins=wins,
                draws=draws,
                losses=losses,
                points=points,
                goals_for=gf,
                goals_against=ga,
            )
            db.add(st)
            rows.append(st)
    db.commit()
    print(f"Created {len(rows)} team standings rows")
    return rows


def create_test_users(db: Session):
    """Create test users for development"""
    users_data = [
        {
            "email": "test@example.com",
            "password": "testpass123",
            "subscription_tier": "free"
        },
        {
            "email": "premium@example.com",
            "password": "premium123",
            "subscription_tier": "premium"
        },
        {
            "email": "admin@example.com",
            "password": "admin123",
            "subscription_tier": "premium_plus"
        }
    ]
    
    users = []
    for user_data in users_data:
        user = User(
            id=uuid4(),
            email=user_data["email"],
            password_hash=get_password_hash(user_data["password"]),
            subscription_tier=user_data["subscription_tier"]
        )
        db.add(user)
        users.append(user)
    
    db.commit()
    print(f"Created {len(users)} test users")
    print("\nTest Users:")
    for user_data in users_data:
        print(f"  Email: {user_data['email']}, Password: {user_data['password']}, Tier: {user_data['subscription_tier']}")
    return users

def seed_database():
    """Main seeding function"""
    print("Starting database seeding...")
    
    # SQLite only: create tables when Alembic is not used. Postgres schema comes from `alembic upgrade head`
    # (GUID/String vs native UUID mismatch would break create_all for team_standings vs teams.id).
    if get_settings().database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_teams = db.query(Team).count()
        if existing_teams > 0:
            auto_yes = os.environ.get("SEED_AUTO_YES", "").strip().lower() in ("1", "true", "yes", "y")
            if auto_yes:
                response = "y"
                print(
                    f"Database already has {existing_teams} teams. SEED_AUTO_YES=1 — clearing and reseeding."
                )
            else:
                response = input(f"Database already has {existing_teams} teams. Clear and reseed? (y/n): ")
            if response.lower() == 'y':
                print("Clearing existing data...")
                db.query(Prediction).delete()
                db.query(GamePlayerSpotlight).delete()
                db.query(Game).delete()
                db.query(TeamStanding).delete()
                db.query(Team).delete()
                db.query(User).delete()
                db.commit()
            else:
                print("Seeding cancelled.")
                return
        
        # Create data
        teams = create_teams(db)
        games = create_games(db, teams)
        predictions = create_predictions(db, games)
        spotlights = create_player_spotlights_demo(db, games)
        standings = create_team_standings(db, teams)
        users = create_test_users(db)
        
        print("\n✅ Database seeding completed successfully!")
        print(f"\nSummary:")
        print(f"  Teams: {len(teams)}")
        print(f"  Games: {len(games)}")
        print(f"  Predictions: {len(predictions)}")
        print(f"  Player spotlights (demo): {len(spotlights)}")
        print(f"  Standings rows: {len(standings)}")
        print(f"  Users: {len(users)}")
        if not get_settings().database_url.startswith("sqlite"):
            print(
                "\nNext (recommended): run the inference job so each prediction gets rich_analysis "
                "(full analysis text). Requires PUSH_CRON_SECRET in the api container env:"
            )
            print(
                '  docker compose exec api python /app/scripts/run_predictions_job.py \'{"force": true}\''
            )

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
