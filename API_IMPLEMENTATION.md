# API Implementation Guide

## 1. FastAPI Application Structure

### 1.1 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration management
│   ├── database.py             # Database connection & session
│   ├── dependencies.py         # Shared dependencies (auth, db)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py             # API dependencies
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py       # Main router
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── games.py        # Games endpoints
│   │       ├── predictions.py  # Predictions endpoints
│   │       ├── players.py      # Player props endpoints
│   │       └── user.py         # User endpoints
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py            # User SQLAlchemy model
│   │   ├── game.py            # Game SQLAlchemy model
│   │   ├── prediction.py      # Prediction SQLAlchemy model
│   │   └── player.py          # Player SQLAlchemy model
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py            # Pydantic schemas for users
│   │   ├── game.py            # Pydantic schemas for games
│   │   ├── prediction.py      # Pydantic schemas for predictions
│   │   └── common.py          # Common schemas (pagination, etc.)
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py    # Authentication logic
│   │   ├── prediction_service.py  # Prediction business logic
│   │   ├── ml_service.py      # ML inference calls
│   │   └── cache_service.py   # Caching logic
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py        # JWT, password hashing
│   │   ├── exceptions.py      # Custom exceptions
│   │   └── logging.py         # Logging configuration
│   │
│   └── ml/
│       ├── __init__.py
│       ├── inference.py       # ML inference client
│       ├── feature_engineering.py  # Feature computation
│       └── explainability.py  # SHAP/LIME explanations
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py            # Pytest fixtures
│   ├── test_auth.py
│   ├── test_predictions.py
│   └── test_ml_service.py
│
├── alembic/                   # Database migrations
├── requirements.txt
├── Dockerfile
└── .env.example
```

### 1.2 Main Application Entry Point

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.api.v1.router import api_router
from app.core.logging import setup_logging
from app.core.exceptions import setup_exception_handlers
from app.monitoring.metrics import setup_metrics
import uvicorn

setup_logging()

app = FastAPI(
    title="Sports Prediction API",
    description="AI-powered sports prediction API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.sportsprediction.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["api.sportsprediction.com", "*.sportsprediction.com"]
)

# Exception handlers
setup_exception_handlers(app)

# Metrics
setup_metrics(app)

# Include routers
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "sports-prediction-api"}

@app.get("/ready")
async def readiness_check():
    """Readiness check (checks DB, Redis, ML service)"""
    # Check database connection
    # Check Redis connection
    # Check ML inference service
    return {"status": "ready"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=4
    )
```

### 1.3 Configuration Management

```python
# app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    database_url: str
    database_pool_size: int = 20
    database_max_overflow: int = 10
    
    # Redis
    redis_url: str
    redis_password: str | None = None
    
    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    
    # API
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = []
    
    # ML Inference
    ml_inference_url: str
    ml_model_version: str = "v1.2.3"
    
    # External APIs
    sportradar_api_key: str
    weather_api_key: str
    
    # Monitoring
    sentry_dsn: str | None = None
    log_level: str = "INFO"
    
    # AWS
    aws_region: str = "us-east-1"
    s3_bucket_models: str
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

### 1.4 Database Setup

```python
# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_pre_ping=True,  # Verify connections before using
    echo=False,  # Set to True for SQL logging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## 2. API Endpoints Implementation

### 2.1 Authentication Endpoints

```python
# app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, Token
from app.services.auth_service import AuthService
from app.core.security import create_access_token, verify_token

router = APIRouter(prefix="/auth", tags=["authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    auth_service = AuthService(db)
    
    # Check if user exists
    if auth_service.get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = auth_service.create_user(user_data)
    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token"""
    auth_service = AuthService(db)
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email, "user_id": str(user.id)})
    refresh_token = create_access_token(
        data={"sub": user.email, "user_id": str(user.id)},
        expires_delta=timedelta(days=7)
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    payload = verify_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    access_token = create_access_token(data={"sub": payload["sub"], "user_id": payload["user_id"]})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout (invalidate token on client side)"""
    # In a more advanced setup, you'd maintain a token blacklist in Redis
    return {"message": "Successfully logged out"}
```

### 2.2 Games & Predictions Endpoints

```python
# app/api/v1/predictions.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.api.deps import get_current_user, get_current_user_optional
from app.schemas.game import GameResponse, GameListResponse
from app.schemas.prediction import PredictionResponse, PredictionExplanationResponse
from app.schemas.common import PaginationParams
from app.services.prediction_service import PredictionService
from app.models.user import User

router = APIRouter(prefix="/games", tags=["games"])

@router.get("/upcoming", response_model=GameListResponse)
async def get_upcoming_games(
    league: Optional[str] = Query(None, description="Filter by league (nfl, nba, mlb, etc.)"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get upcoming games with predictions"""
    prediction_service = PredictionService(db)
    
    games = prediction_service.get_upcoming_games(
        league=league,
        date=date,
        skip=pagination.skip,
        limit=pagination.limit
    )
    
    # Include predictions if user is premium or free tier (limited)
    include_predictions = True
    if current_user and current_user.subscription_tier == "free":
        # Check daily prediction limit for free users
        if prediction_service.has_exceeded_daily_limit(current_user.id):
            include_predictions = False
    
    return {
        "games": [
            {
                **game.dict(),
                "prediction": prediction_service.get_latest_prediction(game.id).dict() 
                    if include_predictions else None
            }
            for game in games
        ],
        "total": len(games),
        "skip": pagination.skip,
        "limit": pagination.limit
    }

@router.get("/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get game details with prediction"""
    prediction_service = PredictionService(db)
    game = prediction_service.get_game_by_id(game_id)
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    prediction = None
    if current_user:
        # Check subscription tier for prediction access
        if current_user.subscription_tier in ["premium", "premium_plus"]:
            prediction = prediction_service.get_latest_prediction(game_id)
        elif current_user.subscription_tier == "free":
            if not prediction_service.has_exceeded_daily_limit(current_user.id):
                prediction = prediction_service.get_latest_prediction(game_id)
    
    return {
        **game.dict(),
        "prediction": prediction.dict() if prediction else None
    }

@router.get("/{game_id}/predictions", response_model=PredictionResponse)
async def get_prediction(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get prediction for a game (requires authentication)"""
    prediction_service = PredictionService(db)
    
    # Check subscription tier
    if current_user.subscription_tier == "free":
        if prediction_service.has_exceeded_daily_limit(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="Daily prediction limit reached. Upgrade to premium for unlimited predictions."
            )
        # Track prediction usage
        prediction_service.increment_daily_prediction_count(current_user.id)
    
    prediction = prediction_service.get_latest_prediction(game_id)
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    return prediction

@router.get("/{game_id}/explanation", response_model=PredictionExplanationResponse)
async def get_prediction_explanation(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed explanation of prediction (SHAP values, feature importance)"""
    prediction_service = PredictionService(db)
    prediction = prediction_service.get_latest_prediction(game_id)
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    # Get explanation from ML service
    explanation = prediction_service.get_prediction_explanation(
        game_id=game_id,
        prediction_id=prediction.id
    )
    
    # Limit explanation depth for free users
    if current_user.subscription_tier == "free":
        explanation["top_features"] = explanation["top_features"][:3]  # Only top 3
        explanation["detailed_shap"] = None  # Hide detailed SHAP values
    
    return explanation

@router.get("/{game_id}/live-predictions")
async def get_live_predictions(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get live in-play predictions (WebSocket preferred, but HTTP endpoint for polling)"""
    # Check subscription tier (live predictions are premium only)
    if current_user.subscription_tier not in ["premium", "premium_plus"]:
        raise HTTPException(
            status_code=403,
            detail="Live predictions require premium subscription"
        )
    
    prediction_service = PredictionService(db)
    live_prediction = prediction_service.get_latest_live_prediction(game_id)
    
    if not live_prediction:
        raise HTTPException(status_code=404, detail="Live prediction not available")
    
    return live_prediction
```

### 2.3 Player Props Endpoints

```python
# app/api/v1/players.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.player import PlayerPropResponse, PlayerPropListResponse
from app.services.prediction_service import PredictionService
from app.models.user import User

router = APIRouter(prefix="/players", tags=["players"])

@router.get("/{player_id}/props", response_model=PlayerPropListResponse)
async def get_player_props(
    player_id: str,
    game_id: str = Query(..., description="Game ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get player prop predictions (premium only)"""
    if current_user.subscription_tier not in ["premium", "premium_plus"]:
        raise HTTPException(
            status_code=403,
            detail="Player props require premium subscription"
        )
    
    prediction_service = PredictionService(db)
    props = prediction_service.get_player_props(player_id=player_id, game_id=game_id)
    
    return {"props": props}

@router.get("/games/{game_id}/player-props", response_model=PlayerPropListResponse)
async def get_game_player_props(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all player props for a game (premium only)"""
    if current_user.subscription_tier not in ["premium", "premium_plus"]:
        raise HTTPException(
            status_code=403,
            detail="Player props require premium subscription"
        )
    
    prediction_service = PredictionService(db)
    props = prediction_service.get_game_player_props(game_id=game_id)
    
    return {"props": props}
```

### 2.4 User Endpoints

```python
# app/api/v1/user.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.user import UserResponse, UserPreferencesUpdate
from app.schemas.common import PredictionHistoryResponse
from app.services.user_service import UserService
from app.models.user import User

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return current_user

@router.get("/favorites")
async def get_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's favorite teams and leagues"""
    user_service = UserService(db)
    favorites = user_service.get_user_favorites(current_user.id)
    return favorites

@router.post("/favorites/teams/{team_id}")
async def add_favorite_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add team to favorites"""
    user_service = UserService(db)
    user_service.add_favorite_team(current_user.id, team_id)
    return {"message": "Team added to favorites"}

@router.get("/prediction-history", response_model=PredictionHistoryResponse)
async def get_prediction_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    pagination: PaginationParams = Depends()
):
    """Get user's prediction viewing history"""
    user_service = UserService(db)
    history = user_service.get_prediction_history(
        user_id=current_user.id,
        skip=pagination.skip,
        limit=pagination.limit
    )
    return history
```

## 3. Service Layer Implementation

### 3.1 Prediction Service

```python
# app/services/prediction_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from datetime import datetime, timedelta
from typing import Optional, List
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.live_prediction import LivePrediction
from app.services.ml_service import MLService
from app.services.cache_service import CacheService
import uuid

class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.ml_service = MLService()
        self.cache = CacheService()
    
    def get_upcoming_games(
        self,
        league: Optional[str] = None,
        date: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Game]:
        """Get upcoming games with optional filters"""
        query = self.db.query(Game).filter(
            Game.status == "scheduled",
            Game.scheduled_time >= datetime.now()
        )
        
        if league:
            query = query.filter(Game.league == league)
        
        if date:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
            query = query.filter(
                Game.scheduled_time >= datetime.combine(date_obj, datetime.min.time()),
                Game.scheduled_time < datetime.combine(date_obj, datetime.min.time()) + timedelta(days=1)
            )
        
        return query.order_by(Game.scheduled_time).offset(skip).limit(limit).all()
    
    def get_game_by_id(self, game_id: str) -> Optional[Game]:
        """Get game by ID"""
        return self.db.query(Game).filter(Game.id == uuid.UUID(game_id)).first()
    
    def get_latest_prediction(self, game_id: str) -> Optional[Prediction]:
        """Get latest prediction for a game (with caching)"""
        cache_key = f"prediction:{game_id}"
        
        # Try cache first
        cached = self.cache.get(cache_key)
        if cached:
            return Prediction(**cached)
        
        # Query database
        prediction = self.db.query(Prediction).filter(
            Prediction.game_id == uuid.UUID(game_id)
        ).order_by(desc(Prediction.created_at)).first()
        
        if prediction:
            # Cache for 1 hour (predictions don't change until game starts)
            self.cache.set(cache_key, prediction.dict(), ttl=3600)
        
        return prediction
    
    def get_latest_live_prediction(self, game_id: str) -> Optional[LivePrediction]:
        """Get latest live prediction (cached for 30 seconds)"""
        cache_key = f"live_prediction:{game_id}"
        
        cached = self.cache.get(cache_key)
        if cached:
            return LivePrediction(**cached)
        
        # Query TimescaleDB
        live_prediction = self.db.query(LivePrediction).filter(
            LivePrediction.game_id == uuid.UUID(game_id)
        ).order_by(desc(LivePrediction.time)).first()
        
        if live_prediction:
            # Cache for 30 seconds
            self.cache.set(cache_key, live_prediction.dict(), ttl=30)
        
        return live_prediction
    
    def get_prediction_explanation(
        self,
        game_id: str,
        prediction_id: str
    ) -> dict:
        """Get SHAP values and feature importance for prediction"""
        cache_key = f"explanation:{prediction_id}"
        
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        # Get explanation from ML service
        explanation = self.ml_service.get_prediction_explanation(
            game_id=game_id,
            prediction_id=prediction_id
        )
        
        # Cache for 1 hour
        self.cache.set(cache_key, explanation, ttl=3600)
        
        return explanation
    
    def has_exceeded_daily_limit(self, user_id: uuid.UUID) -> bool:
        """Check if free user has exceeded daily prediction limit"""
        cache_key = f"daily_predictions:{user_id}:{datetime.now().date()}"
        count = self.cache.get(cache_key) or 0
        return count >= 10  # Free tier limit
    
    def increment_daily_prediction_count(self, user_id: uuid.UUID):
        """Increment daily prediction count for free user"""
        cache_key = f"daily_predictions:{user_id}:{datetime.now().date()}"
        count = self.cache.get(cache_key) or 0
        self.cache.set(cache_key, count + 1, ttl=86400)  # 24 hours
```

### 3.2 ML Service

```python
# app/services/ml_service.py
import httpx
from app.config import get_settings
from app.ml.feature_engineering import FeatureEngineer
from app.ml.explainability import ExplainabilityService
import logging

logger = logging.getLogger(__name__)

class MLService:
    def __init__(self):
        self.settings = get_settings()
        self.feature_engineer = FeatureEngineer()
        self.explainability = ExplainabilityService()
        self.client = httpx.AsyncClient(
            base_url=self.settings.ml_inference_url,
            timeout=10.0
        )
    
    async def predict_game_outcome(
        self,
        game_id: str,
        game_features: dict
    ) -> dict:
        """Call ML inference service for game outcome prediction"""
        try:
            response = await self.client.post(
                "/v1/models/sports_prediction:predict",
                json={
                    "game_id": game_id,
                    "features": game_features,
                    "model_version": self.settings.ml_model_version
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"ML inference error: {e}")
            raise Exception("ML inference service unavailable")
    
    def get_prediction_explanation(
        self,
        game_id: str,
        prediction_id: str
    ) -> dict:
        """Get SHAP values and feature importance"""
        return self.explainability.get_explanation(
            game_id=game_id,
            prediction_id=prediction_id
        )
```

### 3.3 Cache Service

```python
# app/services/cache_service.py
import redis
import json
from typing import Optional, Any
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self.settings = get_settings()
        self.redis_client = redis.from_url(
            self.settings.redis_url,
            password=self.settings.redis_password,
            decode_responses=True
        )
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 3600):
        """Set value in cache with TTL"""
        try:
            self.redis_client.setex(
                key,
                ttl,
                json.dumps(value, default=str)
            )
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    def delete(self, key: str):
        """Delete key from cache"""
        try:
            self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
    
    def increment(self, key: str, amount: int = 1) -> int:
        """Increment counter in cache"""
        try:
            return self.redis_client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Cache increment error: {e}")
            return 0
```

## 4. WebSocket Implementation (Live Updates)

```python
# app/api/v1/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.api.deps import get_current_user_ws
from app.services.prediction_service import PredictionService
from app.database import get_db
import json
import asyncio

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, game_id: str):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, game_id: str):
        if game_id in self.active_connections:
            self.active_connections[game_id].remove(websocket)
    
    async def broadcast(self, game_id: str, message: dict):
        if game_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[game_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            
            # Remove disconnected connections
            for conn in disconnected:
                self.active_connections[game_id].remove(conn)

manager = ConnectionManager()

@router.websocket("/ws/live/{game_id}")
async def websocket_live_updates(
    websocket: WebSocket,
    game_id: str,
    current_user = Depends(get_current_user_ws)
):
    """WebSocket endpoint for live prediction updates"""
    # Check subscription tier
    if current_user.subscription_tier not in ["premium", "premium_plus"]:
        await websocket.close(code=1008, reason="Premium subscription required")
        return
    
    await manager.connect(websocket, game_id)
    
    try:
        # Send initial prediction
        db = next(get_db())
        prediction_service = PredictionService(db)
        live_prediction = prediction_service.get_latest_live_prediction(game_id)
        
        if live_prediction:
            await websocket.send_json({
                "type": "prediction_update",
                "data": live_prediction.dict()
            })
        
        # Keep connection alive and send updates every 30 seconds
        while True:
            await asyncio.sleep(30)
            
            live_prediction = prediction_service.get_latest_live_prediction(game_id)
            if live_prediction:
                await websocket.send_json({
                    "type": "prediction_update",
                    "data": live_prediction.dict()
                })
            
            # Heartbeat
            await websocket.send_json({"type": "ping"})
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, game_id)
```

## 5. Error Handling & Validation

```python
# app/core/exceptions.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

class AppException(Exception):
    """Base application exception"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code

class NotFoundError(AppException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", status_code=404)

class UnauthorizedError(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401)

class ForbiddenError(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status_code=403)

def setup_exception_handlers(app):
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message}
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()}
        )
    
    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(request: Request, exc: SQLAlchemyError):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Database error occurred"}
        )
```

## 6. Testing Examples

```python
# tests/test_predictions.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_upcoming_games():
    response = client.get("/api/v1/games/upcoming?league=nfl")
    assert response.status_code == 200
    data = response.json()
    assert "games" in data
    assert len(data["games"]) > 0

def test_get_prediction_requires_auth():
    response = client.get("/api/v1/games/test-game-id/predictions")
    assert response.status_code == 401

def test_get_prediction_with_auth():
    # Login first
    login_response = client.post(
        "/api/v1/auth/login",
        data={"username": "test@example.com", "password": "testpass"}
    )
    token = login_response.json()["access_token"]
    
    # Get prediction with token
    response = client.get(
        "/api/v1/games/test-game-id/predictions",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
```
