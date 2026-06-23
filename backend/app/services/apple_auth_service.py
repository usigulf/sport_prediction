"""
Verify Sign in with Apple identity tokens (JWT) against Apple's JWKS.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any, Optional

from jose import jwk, jwt
from jose.exceptions import JWTError

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
_JWKS_CACHE: Optional[dict[str, Any]] = None
_JWKS_CACHE_AT = 0.0
_JWKS_TTL_SECONDS = 3600


class AppleAuthError(Exception):
    """Raised when Apple identity token verification fails."""


def _fetch_apple_jwks() -> dict[str, Any]:
    global _JWKS_CACHE, _JWKS_CACHE_AT
    now = time.time()
    if _JWKS_CACHE is not None and now - _JWKS_CACHE_AT < _JWKS_TTL_SECONDS:
        return _JWKS_CACHE
    req = urllib.request.Request(APPLE_JWKS_URL, headers={"User-Agent": "octobetiq-backend/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.load(resp)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise AppleAuthError("Could not fetch Apple signing keys") from exc
    if not isinstance(payload, dict) or "keys" not in payload:
        raise AppleAuthError("Invalid Apple JWKS payload")
    _JWKS_CACHE = payload
    _JWKS_CACHE_AT = now
    return payload


def verify_apple_identity_token(identity_token: str, audience: str) -> dict[str, Any]:
    """Validate JWT signature, issuer, audience, and expiry. Returns claims."""
    try:
        header = jwt.get_unverified_header(identity_token)
    except JWTError as exc:
        raise AppleAuthError("Invalid Apple token header") from exc

    kid = header.get("kid")
    if not kid:
        raise AppleAuthError("Apple token missing key id")

    keys = _fetch_apple_jwks().get("keys") or []
    key_data = next((k for k in keys if k.get("kid") == kid), None)
    if not key_data:
        raise AppleAuthError("Apple signing key not found")

    try:
        public_key = jwk.construct(key_data)
        return jwt.decode(
            identity_token,
            public_key,
            algorithms=["RS256"],
            audience=audience,
            issuer=APPLE_ISSUER,
            options={"verify_aud": True, "verify_iss": True, "verify_exp": True},
        )
    except JWTError as exc:
        raise AppleAuthError("Apple token verification failed") from exc


def clear_apple_jwks_cache_for_tests() -> None:
    """Test helper — force JWKS refetch."""
    global _JWKS_CACHE, _JWKS_CACHE_AT
    _JWKS_CACHE = None
    _JWKS_CACHE_AT = 0.0
