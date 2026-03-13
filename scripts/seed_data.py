"""
Database seed script for development and testing.
Populates database with sample teams, games, and predictions.
"""
import sys
import os
from datetime import datetime, timedelta
from uuid import uuid4

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.team import Team
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.core.security import get_password_hash

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
        # MLB Teams
        {"name": "New York Yankees", "league": "mlb", "abbreviation": "NYY"},
        {"name": "Los Angeles Dodgers", "league": "mlb", "abbreviation": "LAD"},
        {"name": "Houston Astros", "league": "mlb", "abbreviation": "HOU"},
        {"name": "Atlanta Braves", "league": "mlb", "abbreviation": "ATL"},
        {"name": "Boston Red Sox", "league": "mlb", "abbreviation": "BOS"},
        {"name": "Chicago Cubs", "league": "mlb", "abbreviation": "CHC"},
        # NHL Teams
        {"name": "Colorado Avalanche", "league": "nhl", "abbreviation": "COL"},
        {"name": "Toronto Maple Leafs", "league": "nhl", "abbreviation": "TOR"},
        {"name": "Edmonton Oilers", "league": "nhl", "abbreviation": "EDM"},
        {"name": "New York Rangers", "league": "nhl", "abbreviation": "NYR"},
        {"name": "Boston Bruins", "league": "nhl", "abbreviation": "BOS"},
        {"name": "Vegas Golden Knights", "league": "nhl", "abbreviation": "VGK"},
        # Champions League Teams
        {"name": "Real Madrid", "league": "champions_league", "abbreviation": "RMA"},
        {"name": "Barcelona", "league": "champions_league", "abbreviation": "BAR"},
        {"name": "Bayern Munich", "league": "champions_league", "abbreviation": "BAY"},
        {"name": "Paris Saint-Germain", "league": "champions_league", "abbreviation": "PSG"},
        {"name": "Manchester City", "league": "champions_league", "abbreviation": "MCI"},
        {"name": "Inter Milan", "league": "champions_league", "abbreviation": "INT"},
        # Boxing Fighters (modeled as teams)
        {"name": "Tyson Fury", "league": "boxing", "abbreviation": "FURY"},
        {"name": "Oleksandr Usyk", "league": "boxing", "abbreviation": "USYK"},
        {"name": "Anthony Joshua", "league": "boxing", "abbreviation": "AJ"},
        {"name": "Deontay Wilder", "league": "boxing", "abbreviation": "WILD"},
        {"name": "Canelo Alvarez", "league": "boxing", "abbreviation": "CAN"},
        {"name": "Gervonta Davis", "league": "boxing", "abbreviation": "DAVIS"},
        # Tennis Players
        {"name": "Novak Djokovic", "league": "tennis", "abbreviation": "DJOK"},
        {"name": "Carlos Alcaraz", "league": "tennis", "abbreviation": "ALC"},
        {"name": "Daniil Medvedev", "league": "tennis", "abbreviation": "MED"},
        {"name": "Jannik Sinner", "league": "tennis", "abbreviation": "SIN"},
        {"name": "Rafael Nadal", "league": "tennis", "abbreviation": "NAD"},
        {"name": "Stefanos Tsitsipas", "league": "tennis", "abbreviation": "TSI"},
        # Golf Players
        {"name": "Scottie Scheffler", "league": "golf", "abbreviation": "SCH"},
        {"name": "Rory McIlroy", "league": "golf", "abbreviation": "MCIL"},
        {"name": "Jon Rahm", "league": "golf", "abbreviation": "RAHM"},
        {"name": "Viktor Hovland", "league": "golf", "abbreviation": "HOV"},
        {"name": "Xander Schauffele", "league": "golf", "abbreviation": "SCHAU"},
        {"name": "Collin Morikawa", "league": "golf", "abbreviation": "MOR"},
        # MMA Fighters
        {"name": "Jon Jones", "league": "mma", "abbreviation": "JONES"},
        {"name": "Islam Makhachev", "league": "mma", "abbreviation": "MAKH"},
        {"name": "Alexander Volkanovski", "league": "mma", "abbreviation": "VOLK"},
        {"name": "Leon Edwards", "league": "mma", "abbreviation": "EDW"},
        {"name": "Kamaru Usman", "league": "mma", "abbreviation": "USM"},
        {"name": "Conor McGregor", "league": "mma", "abbreviation": "MCG"},
    ]
    
    teams = []
    for team_data in teams_data:
        team = Team(
            id=uuid4(),
            name=team_data["name"],
            league=team_data["league"],
            abbreviation=team_data["abbreviation"],
            logo_url=f"https://example.com/logos/{team_data['abbreviation'].lower()}.png"
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
    mlb_teams = [t for t in teams if t.league == "mlb"]
    nhl_teams = [t for t in teams if t.league == "nhl"]
    cl_teams = [t for t in teams if t.league == "champions_league"]
    boxing_teams = [t for t in teams if t.league == "boxing"]
    tennis_teams = [t for t in teams if t.league == "tennis"]
    golf_teams = [t for t in teams if t.league == "golf"]
    mma_teams = [t for t in teams if t.league == "mma"]

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

    # MLB Games
    for i in range(4):
        game_date = now + timedelta(days=i+1, hours=19)
        home_team = mlb_teams[i % len(mlb_teams)]
        away_team = mlb_teams[(i+1) % len(mlb_teams)]
        game = Game(
            id=uuid4(),
            league="mlb",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)

    # NHL Games
    for i in range(4):
        game_date = now + timedelta(days=i+1, hours=19)
        home_team = nhl_teams[i % len(nhl_teams)]
        away_team = nhl_teams[(i+2) % len(nhl_teams)]
        game = Game(
            id=uuid4(),
            league="nhl",
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

    # Boxing Matches
    for i in range(3):
        game_date = now + timedelta(days=i+4, hours=21)
        home_team = boxing_teams[i % len(boxing_teams)]
        away_team = boxing_teams[(i+1) % len(boxing_teams)]
        game = Game(
            id=uuid4(),
            league="boxing",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)

    # Tennis Matches
    for i in range(4):
        game_date = now + timedelta(days=i+2, hours=14)
        home_team = tennis_teams[i % len(tennis_teams)]
        away_team = tennis_teams[(i+2) % len(tennis_teams)]
        game = Game(
            id=uuid4(),
            league="tennis",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)

    # Golf Tournaments (matchups)
    for i in range(3):
        game_date = now + timedelta(days=i+5, hours=8)
        home_team = golf_teams[i % len(golf_teams)]
        away_team = golf_teams[(i+1) % len(golf_teams)]
        game = Game(
            id=uuid4(),
            league="golf",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)

    # MMA Fights
    for i in range(3):
        game_date = now + timedelta(days=i+6, hours=22)
        home_team = mma_teams[i % len(mma_teams)]
        away_team = mma_teams[(i+1) % len(mma_teams)]
        game = Game(
            id=uuid4(),
            league="mma",
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=game_date,
            status="scheduled"
        )
        db.add(game)
        games.append(game)

    # Create some finished games for historical data
    for i in range(10):
        game_date = now - timedelta(days=i+1)
        home_team = nfl_teams[i % len(nfl_teams)]
        away_team = nfl_teams[(i+1) % len(nfl_teams)]
        
        # Random scores
        import random
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
            away_score=away_score
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
        elif game.league == "mlb":
            expected_home_score = round(random.uniform(4, 6), 1)
            expected_away_score = round(random.uniform(3, 5), 1)
        elif game.league == "nhl":
            expected_home_score = round(random.uniform(2.5, 3.5), 1)
            expected_away_score = round(random.uniform(2.0, 3.0), 1)
        elif game.league == "boxing":
            # Boxing: rounds won (12 rounds)
            expected_home_score = round(random.uniform(7, 10), 1)
            expected_away_score = round(random.uniform(5, 9), 1)
        elif game.league == "tennis":
            # Tennis: sets won (best of 3)
            expected_home_score = round(random.uniform(1.5, 2.5), 1)
            expected_away_score = round(random.uniform(0.5, 1.5), 1)
        elif game.league == "golf":
            # Golf: strokes (lower is better, but we show as matchup score)
            expected_home_score = round(random.uniform(68, 72), 1)
            expected_away_score = round(random.uniform(69, 73), 1)
        elif game.league == "mma":
            # MMA: rounds won (3 or 5 rounds)
            expected_home_score = round(random.uniform(2, 3), 1)
            expected_away_score = round(random.uniform(1, 2.5), 1)
        else:  # Premier League, Champions League (soccer)
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
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_teams = db.query(Team).count()
        if existing_teams > 0:
            response = input(f"Database already has {existing_teams} teams. Clear and reseed? (y/n): ")
            if response.lower() == 'y':
                print("Clearing existing data...")
                db.query(Prediction).delete()
                db.query(Game).delete()
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
        users = create_test_users(db)
        
        print("\n✅ Database seeding completed successfully!")
        print(f"\nSummary:")
        print(f"  Teams: {len(teams)}")
        print(f"  Games: {len(games)}")
        print(f"  Predictions: {len(predictions)}")
        print(f"  Users: {len(users)}")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
