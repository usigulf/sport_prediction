"""
Referral-aware share URLs and pick card payload for share_pick.
"""
from __future__ import annotations

from typing import Any, Optional
from urllib.parse import urlencode
from uuid import UUID

from app.config import get_settings

settings = get_settings()


def build_share_web_url(game_id: UUID | str, referrer_id: Optional[UUID | str] = None) -> str:
    params: dict[str, str] = {"game": str(game_id)}
    if referrer_id:
        params["ref"] = str(referrer_id)
    base = settings.public_app_url.rstrip("/")
    return f"{base}/?{urlencode(params)}"


def build_share_deep_link(game_id: UUID | str, referrer_id: Optional[UUID | str] = None) -> str:
    link = f"com.sportsprediction.app://game/{game_id}"
    if referrer_id:
        link += f"?ref={referrer_id}"
    return link


def pick_favored_team(
    home_name: str,
    away_name: str,
    home_win_probability: Optional[float],
    away_win_probability: Optional[float],
) -> tuple[Optional[str], Optional[int]]:
    if home_win_probability is None or away_win_probability is None:
        return None, None
    home_f = float(home_win_probability)
    away_f = float(away_win_probability)
    if home_f >= away_f:
        return home_name, round(home_f * 100)
    return away_name, round(away_f * 100)


def build_share_card(
    *,
    home_name: str,
    away_name: str,
    league: Optional[str],
    confidence: Optional[str],
    home_win_probability: Optional[float] = None,
    away_win_probability: Optional[float] = None,
    referrer_id: Optional[UUID | str] = None,
    rolling_accuracy_pct: Optional[float] = None,
) -> dict[str, Any]:
    favored_team, pick_probability_pct = (None, None)
    if confidence:
        favored_team, pick_probability_pct = pick_favored_team(
            home_name, away_name, home_win_probability, away_win_probability
        )
    return {
        "home_name": home_name,
        "away_name": away_name,
        "league": league,
        "confidence": confidence,
        "favored_team": favored_team,
        "pick_probability_pct": pick_probability_pct,
        "referral_code": str(referrer_id) if referrer_id else None,
        "rolling_accuracy_pct": rolling_accuracy_pct,
    }
