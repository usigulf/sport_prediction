"""Ensure tracked .env*.example files never ship real-looking secrets."""
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
EXAMPLE_FILES = [
    REPO_ROOT / ".env.example",
    REPO_ROOT / ".env.production.example",
    REPO_ROOT / "backend" / ".env.example",
    REPO_ROOT / "mobile" / ".env.example",
]

# Values that must not appear in example templates (leaked or production-like).
FORBIDDEN_SUBSTRINGS = [
    "gTgoo2Nnx2xTFc/KmiT6oksA8OlBnFU6",  # leaked PUSH_CRON_SECRET (P0-005)
    "AppReview2026!",
]

# Active (uncommented) lines must use explicit placeholders, not realistic random strings.
REQUIRED_PLACEHOLDER_MARKERS = [
    "REPLACE_WITH",
    "your-",
    "xxx",
    "XXXXXXXX",
]


def _active_assignments(text: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        rows.append((key.strip(), value.strip()))
    return rows


@pytest.mark.parametrize("path", EXAMPLE_FILES, ids=lambda p: str(p.relative_to(REPO_ROOT)))
def test_env_example_files_exist(path: Path):
    assert path.is_file(), f"missing {path}"


@pytest.mark.parametrize("path", EXAMPLE_FILES, ids=lambda p: str(p.relative_to(REPO_ROOT)))
def test_env_examples_forbid_known_leaked_secrets(path: Path):
    text = path.read_text(encoding="utf-8")
    for bad in FORBIDDEN_SUBSTRINGS:
        assert bad not in text, f"{path.name} still contains forbidden value pattern: {bad}"


@pytest.mark.parametrize("path", EXAMPLE_FILES, ids=lambda p: str(p.relative_to(REPO_ROOT)))
def test_env_examples_secret_keys_use_placeholders(path: Path):
    text = path.read_text(encoding="utf-8")
    secret_keys = (
        "JWT_SECRET",
        "PUSH_CRON_SECRET",
        "REDIS_PASSWORD",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "SMTP_PASSWORD",
        "CLEARSPORTS_API_KEY",
        "REVENUECAT_WEBHOOK_AUTH",
        "REVENUECAT_SECRET_API_KEY",
    )
    for key, value in _active_assignments(text):
        if key not in secret_keys:
            continue
        if not value:
            continue
        assert any(marker in value for marker in REQUIRED_PLACEHOLDER_MARKERS) or value in {
            "",
        }, f"{path.name} {key} must use a placeholder, got {value!r}"


def test_production_example_sets_internal_allowed_cidrs():
    text = (REPO_ROOT / ".env.production.example").read_text(encoding="utf-8")
    assert "INTERNAL_ALLOWED_CIDRS=127.0.0.1/32" in text
    assert "172.16.0.0/12" in text
