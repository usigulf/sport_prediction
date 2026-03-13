"""
FastAPI application entry point
"""
import asyncio
import logging
from typing import Optional
from urllib.parse import parse_qs
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload
from app.api.v1.router import api_router
from app.api.internal import router as internal_router
from app.core.exceptions import setup_exception_handlers
from app.core.security import verify_token
from app.config import get_settings
from app.database import get_db
from app.models.game import Game
from app.models.user import User
from app.services.prediction_service import PredictionService

settings = get_settings()

app = FastAPI(
    title="Octobet API",
    description="AI-powered sports prediction API",
    version="1.0.0",
    docs_url="/docs" if getattr(settings, "openapi_docs_enabled", True) else None,
    redoc_url="/redoc" if getattr(settings, "openapi_docs_enabled", True) else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
setup_exception_handlers(app)

# Include routers
app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(internal_router)


DEV_JWT_SECRET = "dev-secret-key-change-in-production-minimum-32-characters-long"


@app.on_event("startup")
def on_startup():
    """Create SQLite tables if using SQLite (dev). Validate production config."""
    from app.database import init_sqlite_tables
    init_sqlite_tables()
    if getattr(settings, "environment", "").lower() == "production":
        if settings.jwt_secret == DEV_JWT_SECRET or len(settings.jwt_secret) < 32:
            logging.getLogger(__name__).critical(
                "Production requires a strong JWT_SECRET (min 32 chars). Set JWT_SECRET in env."
            )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "sports-prediction-api"}


def _get_ws_token(websocket: WebSocket) -> Optional[str]:
    """Get JWT from WebSocket query string (?token=...) or (?access_token=...)."""
    query_string = websocket.scope.get("query_string") or b""
    query = parse_qs(query_string.decode("utf-8"))
    token = (query.get("token") or query.get("access_token")) or []
    if not token:
        return None
    raw = token[0].strip()
    if raw.lower().startswith("bearer "):
        return raw[7:].strip()
    return raw


@app.websocket("/ws/live/{game_id}")
async def websocket_live_updates(
    websocket: WebSocket,
    game_id: str,
    db: Session = Depends(get_db),
):
    """
    Live updates stream for a game. Sends prediction + score every 30s (stub until real live pipeline).
    Requires JWT in query: ?token=<access_token>. Premium tier required for live updates.
    """
    token = _get_ws_token(websocket)
    if not token:
        await websocket.close(code=1008, reason="Missing token. Use ?token=<access_token>")
        return
    payload = verify_token(token)
    if not payload:
        await websocket.close(code=1008, reason="Invalid or expired token")
        return
    user_id = payload.get("user_id")
    if not user_id:
        await websocket.close(code=1008, reason="Invalid token payload")
        return
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(code=1008, reason="User not found")
        return
    if (user.subscription_tier or "free").lower() not in ("premium", "premium_plus", "trialing", "pro"):
        await websocket.close(code=1008, reason="Premium subscription required for live updates")
        return
    await websocket.accept()
    try:
        while True:
            game = (
                db.query(Game)
                .options(joinedload(Game.home_team), joinedload(Game.away_team))
                .filter(Game.id == game_id)
                .first()
            )
            if not game:
                await websocket.send_json({"error": "Game not found"})
                break
            prediction = PredictionService(db).get_latest_prediction(game_id)
            payload = {
                "type": "update",
                "game_id": game_id,
                "home_score": game.home_score or 0,
                "away_score": game.away_score or 0,
                "home_win_probability": float(prediction.home_win_probability) if prediction else 0.5,
                "away_win_probability": float(prediction.away_win_probability) if prediction else 0.5,
                "confidence_level": prediction.confidence_level if prediction else None,
            }
            await websocket.send_json(payload)
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass


@app.get("/ready")
async def readiness_check():
    """Readiness check: DB must be reachable. Redis is optional (skipped if REDIS_URL is empty)."""
    from app.database import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        return JSONResponse(
            content={"status": "not_ready", "reason": f"database: {e}"},
            status_code=503,
        )
    if settings.redis_url and settings.redis_url.strip().lower() not in ("", "disabled", "false"):
        try:
            from app.services.cache_service import CacheService
            cache = CacheService()
            if cache.redis_client is not None:
                cache.redis_client.ping()
        except Exception as e:
            return JSONResponse(
                content={"status": "not_ready", "reason": f"redis: {e}"},
                status_code=503,
            )
    return {"status": "ready"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
