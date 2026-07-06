"""DISC-001: share endpoint must respect free-tier prediction limits."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
GAMES_API = REPO_ROOT / "backend" / "app" / "api" / "v1" / "games.py"


def test_share_endpoint_checks_free_tier_before_confidence():
    text = GAMES_API.read_text(encoding="utf-8")
    assert "grant_free_tier_prediction_view" in text
    share = text.split('async def share_pick')[1].split("async def ")[0]
    assert "confidence = pred.confidence_level" in share or "confidence = pred" in share
    assert "Daily prediction limit reached" in share
