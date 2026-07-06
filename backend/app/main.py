"""
FastAPI application entry point
"""
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware as StarletteCORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.api.v1.router import api_router
from app.api.internal import router as internal_router
from app.core.exceptions import setup_exception_handlers
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import SessionLocal
from app.services.live_websocket_auth import authenticate_live_websocket, get_ws_token
from app.services.live_websocket_hub import live_ws_hub

settings = get_settings()


class CORSMiddlewareHTTPOnly(StarletteCORSMiddleware):
    """
    Starlette's CORSMiddleware only skips non-http scopes in recent versions; older stacks
    still run CORS on WebSocket and return 403 on the handshake when Origin is missing (curl, RN).
    """

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        await super().__call__(scope, receive, send)



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    from app.core.jwt_constants import is_weak_jwt_secret
    from app.database import init_sqlite_tables

    init_sqlite_tables()
    if getattr(settings, "environment", "").lower() == "production":
        if is_weak_jwt_secret(settings.jwt_secret):
            logging.getLogger(__name__).critical(
                "Production requires a strong JWT_SECRET (min 32 chars, not a default). Set JWT_SECRET in env."
            )
        if settings.redis_url.strip().lower() in ("", "disabled", "false"):
            logging.getLogger(__name__).critical(
                "Production requires REDIS_URL for shared rate limits and token revocation."
            )
    if settings.sentry_dsn:
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration

            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                environment=settings.environment,
                integrations=[FastApiIntegration()],
                traces_sample_rate=0.1,
            )
        except Exception as exc:
            logging.getLogger(__name__).warning("Sentry init failed: %s", exc)
    await live_ws_hub.start()
    yield
    await live_ws_hub.stop()


app = FastAPI(
    title="Octobet API",
    description="AI-powered sports prediction API",
    version="1.0.0",
    docs_url="/docs" if getattr(settings, "openapi_docs_enabled", True) else None,
    redoc_url="/redoc" if getattr(settings, "openapi_docs_enabled", True) else None,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddlewareHTTPOnly,
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


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "sports-prediction-api"}


def _get_ws_token(websocket: WebSocket):
    """Backward-compatible alias for tests and callers."""
    return get_ws_token(websocket)


@app.websocket("/ws/live/{game_id}")
async def websocket_live_updates(
    websocket: WebSocket,
    game_id: str,
):
    """
    Live updates stream for a game. Subscribes to the in-process pub/sub hub (Redis-backed
    when configured). Requires JWT: Authorization: Bearer <access_token>, or
    Sec-WebSocket-Protocol bearer.<jwt> on web. Premium tier required.
    """
    await websocket.accept()
    db = SessionLocal()
    queue = None
    game_key = None
    try:
        auth = await authenticate_live_websocket(websocket, db, game_id)
        if auth is None:
            return
        game_uuid, _user = auth
        game_key = str(game_uuid)
        queue = await live_ws_hub.subscribe(game_key)

        while True:
            message = await queue.get()
            if message.get("type") == "error":
                await websocket.send_json({"error": message.get("error", "error")})
                if message.get("error") == "Game not found":
                    break
                continue
            await websocket.send_json(message)
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        if queue is not None and game_key is not None:
            await live_ws_hub.unsubscribe(game_key, queue)
        db.close()


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
