"""
Security utilities: JWT tokens, password hashing
"""
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt

from app.config import get_settings
from app.core.jwt_constants import TOKEN_TYPE_ACCESS, TOKEN_TYPE_REFRESH
from app.services.token_revocation_service import is_token_revoked, revoke_token

settings = get_settings()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash"""
    p = plain_password.encode("utf-8")
    h = hashed_password.encode("utf-8") if isinstance(hashed_password, str) else hashed_password
    return bcrypt.checkpw(p, h)


def get_password_hash(password: str) -> str:
    """Hash a password with bcrypt (passlib incompatible with bcrypt 4.x)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _encode_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token (cannot be used for refresh)."""
    delta = expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {**data, "type": TOKEN_TYPE_ACCESS}
    return _encode_token(payload, delta)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT refresh token (cannot be used for API access)."""
    delta = expires_delta or timedelta(days=settings.jwt_refresh_token_expire_days)
    payload = {**data, "type": TOKEN_TYPE_REFRESH}
    return _encode_token(payload, delta)


def _decode_token(token: str) -> Optional[dict[str, Any]]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    jti = payload.get("jti")
    if is_token_revoked(jti):
        return None
    return payload


def verify_access_token(token: str) -> Optional[dict[str, Any]]:
    """Verify access token; rejects refresh tokens."""
    payload = _decode_token(token)
    if not payload:
        return None
    token_type = payload.get("type")
    if token_type and token_type != TOKEN_TYPE_ACCESS:
        return None
    # Legacy tokens without type claim remain valid as access tokens.
    return payload


def verify_refresh_token(token: str) -> Optional[dict[str, Any]]:
    """Verify refresh token; rejects access tokens."""
    payload = _decode_token(token)
    if not payload:
        return None
    if payload.get("type") != TOKEN_TYPE_REFRESH:
        return None
    return payload


def verify_token(token: str) -> Optional[dict[str, Any]]:
    """Backward-compatible alias — validates access tokens only."""
    return verify_access_token(token)


def revoke_token_by_payload(payload: dict[str, Any]) -> None:
    """Revoke a token using exp + jti from its decoded payload."""
    jti = payload.get("jti")
    exp = payload.get("exp")
    if not jti or not exp:
        return
    if isinstance(exp, datetime):
        expires_at = exp if exp.tzinfo else exp.replace(tzinfo=timezone.utc)
    else:
        expires_at = datetime.fromtimestamp(float(exp), tz=timezone.utc)
    remaining = int((expires_at - datetime.now(timezone.utc)).total_seconds())
    revoke_token(str(jti), remaining)
