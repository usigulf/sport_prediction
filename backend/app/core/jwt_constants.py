"""Shared JWT constants and weak-secret detection."""

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"

# Any of these in production triggers a critical startup warning.
WEAK_JWT_SECRETS = frozenset(
    {
        "dev-secret-key-change-in-production-minimum-32-characters-long",
        "dev-secret-key-change-in-production-min-32-chars",
        "changeme",
        "secret",
    }
)


def is_weak_jwt_secret(secret: str) -> bool:
    s = (secret or "").strip()
    if not s:
        return True
    if s in WEAK_JWT_SECRETS:
        return True
    return len(s) < 32
