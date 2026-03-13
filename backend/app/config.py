"""
Application configuration management
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List, Optional


class Settings(BaseSettings):
    # Database: default SQLite (no install needed). For PostgreSQL set DATABASE_URL.
    database_url: str = "sqlite:///./app.db"
    database_pool_size: int = 20
    database_max_overflow: int = 10
    
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
    # Optional: path to directory containing simple_model.pkl and feature_columns.pkl (for real explanations)
    explanation_model_dir: Optional[str] = None
    
    # External APIs
    sportradar_api_key: str = ""
    sportradar_api_url: str = "https://api.sportradar.com"
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
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
