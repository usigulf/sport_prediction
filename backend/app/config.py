"""
Application configuration management
"""
from functools import lru_cache
import ipaddress
from pathlib import Path
from typing import List, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.jwt_constants import is_weak_jwt_secret

# backend/app/config.py -> parent.parent == backend/ (Docker: /app)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_BACKEND_ENV = _BACKEND_DIR / ".env"


def _env_file() -> str:
    """Prefer backend/.env by absolute path so loading does not depend on process cwd."""
    if _BACKEND_ENV.is_file():
        return str(_BACKEND_ENV)
    return ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file(),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )
    # Database: default SQLite (no install needed). For PostgreSQL set DATABASE_URL.
    database_url: str = "sqlite:///./app.db"
    # Keep total connections << Postgres max_connections (esp. with multiple uvicorn workers).
    database_pool_size: int = 5
    database_max_overflow: int = 5
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_password: Optional[str] = None
    
    # JWT
    jwt_secret: str = "dev-secret-key-change-in-production-minimum-32-characters-long"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    
    # API
    api_v1_prefix: str = "/api/v1"
    # Rate limiting (per window): auth by IP, predictions by user or IP
    rate_limit_auth_per_minute: int = 20
    rate_limit_predictions_per_minute: int = 120
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:19000",
        "https://app.sportsprediction.com"
    ]
    
    # ML Inference (sklearn pickles via EXPLANATION_MODEL_DIR; TF Serving not used)
    ml_model_version: str = "v1.0.0"
    # Optional: directory with simple_model.pkl + feature_columns.pkl (explanations + batch inference job)
    explanation_model_dir: Optional[str] = None
    # Optional: override artifact path for inference only; defaults to explanation_model_dir
    model_artifact_dir: Optional[str] = None
    # Gate explanations / rich output when computed quality is below threshold.
    min_data_quality_score: float = 0.45
    
    # External APIs
    sportradar_api_key: str = ""
    sportradar_api_url: str = "https://api.sportradar.com"
    # ClearSports (clearsportsapi.com): Bearer auth; not a drop-in for Sportradar URLs — use for new integrations / probes.
    clearsports_api_key: str = ""
    clearsports_api_base_url: str = "https://api.clearsportsapi.com"
    # Season string for ClearSports soccer feeds (e.g. 2024-2025). Mirrors SPORTRADAR_SOCCER_SEASON_* when set.
    clearsports_soccer_season_premier_league: Optional[str] = None
    clearsports_soccer_season_la_liga: Optional[str] = None
    clearsports_soccer_season_serie_a: Optional[str] = None
    clearsports_soccer_season_bundesliga: Optional[str] = None
    clearsports_soccer_season_mls: Optional[str] = None
    clearsports_soccer_season_champions_league: Optional[str] = None
    # ClearSports US sports season year (e.g. 2025 for NBA 2024-25 / NFL season)
    clearsports_nfl_season: Optional[str] = None
    clearsports_nba_season: Optional[str] = None
    # Comma-separated app league codes to sync (empty = all with season/config). Beta: premier_league
    soccer_sync_leagues: str = ""
    # NFL v7 standings: /nfl/official/{access}/v7/en/seasons/{year}/REG/standings/season.json
    sportradar_access_level: str = "trial"  # trial | production
    sportradar_nfl_season_year: Optional[int] = None  # default: inferred from calendar (see us schedule sync)
    sportradar_nba_season_year: Optional[int] = None  # default: NBA season start year (Oct–Sep)
    # Soccer v4 standings: /soccer/{access}/v4/en/seasons/{sr:season:...}/standings.json
    sportradar_soccer_season_premier_league: Optional[str] = None
    sportradar_soccer_season_champions_league: Optional[str] = None
    sportradar_soccer_season_la_liga: Optional[str] = None
    sportradar_soccer_season_serie_a: Optional[str] = None
    sportradar_soccer_season_bundesliga: Optional[str] = None
    sportradar_soccer_season_mls: Optional[str] = None
    weather_api_key: str = ""
    
    # Monitoring
    sentry_dsn: Optional[str] = None
    log_level: str = "INFO"
    
    # AWS
    aws_region: str = "us-east-1"
    s3_bucket_models: str = "sport-prediction-models"
    
    # Environment
    environment: str = "development"
    # Disable OpenAPI docs (Swagger / ReDoc) in production. Set OPENAPI_DOCS_ENABLED=false in production.
    openapi_docs_enabled: bool = True
    # Optional: secret for internal cron endpoints (e.g. push triggers). If set, require X-Cron-Secret header.
    push_cron_secret: Optional[str] = None
    # Optional: comma-separated CIDRs allowed to access /internal/* (defense in depth).
    # Example: "127.0.0.1/32,10.0.0.0/8".
    internal_allowed_cidrs: str = ""
    # When True, rate limits use X-Forwarded-For (first hop). Enable only behind a trusted reverse proxy.
    trust_forwarded_headers: bool = False
    
    # Stripe (payments). Set STRIPE_SECRET_KEY to enable checkout. Webhook: POST /api/v1/subscription/webhook
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None  # Stripe signing secret for checkout.session.completed
    stripe_price_id_premium: Optional[str] = None  # price_xxx for Premium monthly
    stripe_price_id_premium_plus: Optional[str] = None  # price_xxx for Pro (tier premium_plus)
    # Host deploy/payment-pages/*.html on your domain (match nginx canonical host www vs apex).
    stripe_success_url: str = "https://www.octobetiq.com/payment/success"
    stripe_cancel_url: str = "https://www.octobetiq.com/payment/cancel"

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        env = (self.environment or "").lower()
        if env != "production":
            return self
        if is_weak_jwt_secret(self.jwt_secret):
            raise ValueError(
                "Production requires JWT_SECRET with at least 32 characters "
                "(not a default/dev value). Set JWT_SECRET in .env / .env.production."
            )
        redis = (self.redis_url or "").strip().lower()
        if redis in ("", "disabled", "false"):
            raise ValueError(
                "Production requires REDIS_URL for rate limits and token revocation."
            )
        cidrs = (self.internal_allowed_cidrs or "").strip()
        if cidrs:
            for raw in cidrs.split(","):
                c = raw.strip()
                if not c:
                    continue
                try:
                    ipaddress.ip_network(c, strict=False)
                except ValueError as e:
                    raise ValueError(f"Invalid INTERNAL_ALLOWED_CIDRS entry: {c}") from e
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
