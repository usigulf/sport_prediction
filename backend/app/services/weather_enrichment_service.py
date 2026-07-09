"""Weather context for outdoor games (I98) via OpenWeatherMap."""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.game import Game
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)

# NFL outdoor venues (approximate lat/lon for forecast near kickoff).
NFL_STADIUM_COORDS: dict[str, tuple[float, float]] = {
    "KC": (39.0489, -94.4839),
    "BUF": (42.7738, -78.7870),
    "MIA": (25.9580, -80.2389),
    "NE": (42.0909, -71.2643),
    "NYJ": (40.8128, -74.0742),
    "NYG": (40.8128, -74.0742),
    "BAL": (39.2780, -76.6227),
    "CIN": (39.0955, -84.5161),
    "CLE": (41.5061, -81.6995),
    "PIT": (40.4468, -80.0158),
    "HOU": (29.6847, -95.4107),
    "IND": (39.7601, -86.1639),
    "JAX": (30.3239, -81.6373),
    "TEN": (36.1665, -86.7713),
    "DEN": (39.7439, -105.0201),
    "LV": (36.0909, -115.1833),
    "LAC": (33.9533, -118.3387),
    "DAL": (32.7473, -97.0945),
    "WAS": (38.9076, -76.8645),
    "PHI": (39.9008, -75.1675),
    "CHI": (41.8623, -87.6167),
    "DET": (42.3400, -83.0456),
    "GB": (44.5013, -88.0622),
    "MIN": (44.9738, -93.2581),
    "ATL": (33.7553, -84.4006),
    "CAR": (35.2258, -80.8528),
    "NO": (29.9511, -90.0812),
    "TB": (27.9759, -82.5033),
    "ARI": (33.5276, -112.2626),
    "LAR": (33.9533, -118.3387),
    "SF": (37.4030, -121.9697),
    "SEA": (47.5952, -122.3316),
}

OUTDOOR_LEAGUES = frozenset({"nfl"})


def _coords_for_game(game: Game) -> tuple[float, float] | None:
    home = getattr(game.home_team, "abbreviation", None) or ""
    abbr = str(home).upper().strip()
    return NFL_STADIUM_COORDS.get(abbr)


def _fetch_forecast(lat: float, lon: float, api_key: str) -> dict[str, Any] | None:
    params = urllib.parse.urlencode(
        {"lat": lat, "lon": lon, "appid": api_key, "units": "imperial", "cnt": 8}
    )
    url = f"https://api.openweathermap.org/data/2.5/forecast?{params}"
    try:
        with urllib.request.urlopen(url, timeout=12) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        logger.warning("Weather fetch failed: %s", e)
        return None


def weather_for_game(db: Session, game: Game) -> dict[str, Any]:
    league = (game.league or "").lower()
    if league not in OUTDOOR_LEAGUES:
        return {
            "available": False,
            "reason": "league_not_supported",
            "league": league,
        }
    coords = _coords_for_game(game)
    if not coords:
        return {"available": False, "reason": "venue_coords_unknown"}
    settings = get_settings()
    api_key = (settings.weather_api_key or "").strip()
    if not api_key:
        return {"available": False, "reason": "not_configured"}

    lat, lon = coords
    cache = CacheService()
    cache_key = f"weather:v1:{game.id}:{lat:.2f}:{lon:.2f}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        return cached

    raw = _fetch_forecast(lat, lon, api_key)
    if not raw:
        return {"available": False, "reason": "fetch_failed"}

    kickoff = game.scheduled_time
    if kickoff and kickoff.tzinfo is None:
        kickoff = kickoff.replace(tzinfo=timezone.utc)

    best = None
    best_delta = None
    for item in raw.get("list") or []:
        dt = item.get("dt")
        if dt is None:
            continue
        forecast_time = datetime.fromtimestamp(int(dt), tz=timezone.utc)
        if kickoff is None:
            best = item
            break
        delta = abs((forecast_time - kickoff).total_seconds())
        if best_delta is None or delta < best_delta:
            best_delta = delta
            best = item

    if not best:
        return {"available": False, "reason": "no_forecast"}

    main = best.get("main") or {}
    wind = best.get("wind") or {}
    weather_list = best.get("weather") or []
    desc = weather_list[0].get("description") if weather_list else None
    payload = {
        "available": True,
        "league": league,
        "temp_f": main.get("temp"),
        "feels_like_f": main.get("feels_like"),
        "humidity_pct": main.get("humidity"),
        "wind_mph": wind.get("speed"),
        "description": desc,
        "forecast_time_iso": datetime.fromtimestamp(int(best["dt"]), tz=timezone.utc).isoformat(),
        "disclaimer": "Weather is informational for outdoor games — not used in model inference yet.",
    }
    cache.set(cache_key, payload, ttl=1800)
    return payload
