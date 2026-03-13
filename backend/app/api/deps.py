"""
API dependencies (authentication, database, etc.)
"""
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import verify_token
from app.config import get_settings
from app.services.rate_limit_service import is_over_limit

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
# Optional Bearer token: no 403 when header is missing (for public endpoints).
optional_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if Bearer token present and valid, None otherwise (no 403 when missing)."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials.credentials, db)
    except HTTPException:
        return None


def _client_ip(request: Request) -> str:
    """Client IP for rate limiting (X-Forwarded-For if present, else client.host)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit_auth(request: Request) -> None:
    """Dependency: raise 429 if auth rate limit (by IP) exceeded."""
    settings = get_settings()
    if is_over_limit(
        _client_ip(request),
        "auth",
        settings.rate_limit_auth_per_minute,
        window_seconds=60,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again in a minute.",
        )


def rate_limit_predictions(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> None:
    """Dependency: raise 429 if prediction rate limit (by user or IP) exceeded."""
    settings = get_settings()
    identifier = str(current_user.id) if current_user else _client_ip(request)
    if is_over_limit(
        identifier,
        "predictions",
        settings.rate_limit_predictions_per_minute,
        window_seconds=60,
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again in a minute.",
        )
