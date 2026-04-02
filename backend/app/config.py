"""
Application configuration management
"""
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

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
    
    # ML Inference
    ml_inference_url: str = "http://localhost:8501"
    ml_model_version: str = "v1.0.0"
    # Optional: directory with simple_model.pkl + feature_columns.pkl (explanations + batch inference job)
    explanation_model_dir: Optional[str] = None
    # Optional: override artifact path for inference only; defaults to explanation_model_dir
    model_artifact_dir: Optional[str] = None
    
    # External APIs
    sportradar_api_key: str = ""
    sportradar_api_url: str = "https://api.sportradar.com"
    # NFL v7 standings: /nfl/official/{access}/v7/en/seasons/{year}/REG/standings/season.json
    sportradar_access_level: str = "trial"  # trial | production
    sportradar_nfl_season_year: Optional[int] = None  # default: current UTC calendar year
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
    
    # Stripe (payments). Set STRIPE_SECRET_KEY to enable checkout.
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_price_id_premium: Optional[str] = None  # price_xxx for Premium monthly
    stripe_success_url: str = "https://app.sportsprediction.com/payment/success"
    stripe_cancel_url: str = "https://app.sportsprediction.com/payment/cancel"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
