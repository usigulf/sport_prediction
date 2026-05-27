"""
Import NFL and NBA schedules from Sportradar into `teams` / `games`.

NFL: GET /nfl/official/{access}/v7/en/games/{year}/REG/schedule.json
NBA: GET /nba/{access}/v8/en/games/{year}/REG/schedule.json

Call POST /internal/us-sports/sync-schedules (X-Cron-Secret), then POST /internal/predictions/run.
"""
from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

import urllib.error
import urllib.request

from sqlalchemy.orm import Session

from app.config import Settings
from app.models.game import Game
from app.services.sportradar_soccer_schedule_sync import get_or_create_team

logger = logging.getLogger(__name__)

UsLeague = Literal["nfl", "nba"]

_NFL_GAME_UUID_NS = uuid.uuid5(uuid.NAMESPACE_URL, "https://developer.sportradar.com/nfl/game")
_NBA_GAME_UUID_NS = uuid.uuid5(uuid.NAMESPACE_URL, "https://developer.sportradar.com/nba/game")


def us_game_id_to_uuid(league: UsLeague, external_id: str) -> uuid.UUID:
    ns = _NFL_GAME_UUID_NS if league == "nfl" else _NBA_GAME_UUID_NS
    return uuid.uuid5(ns, external_id.strip())


def default_nfl_season_year(now: datetime | None = None) -> int:
    """Sportradar season year for NFL REG (Jan–Aug → prior season)."""
    now = now or datetime.now(timezone.utc)
    y = now.year
    if now.month < 9:
        return y - 1
    return y


def default_nba_season_year(now: datetime | None = None) -> int:
    """Sportradar season year for NBA REG (Oct–Jun → season start year)."""
    now = now or datetime.now(timezone.utc)
    y = now.year
    if now.month < 10:
        return y - 1
    return y


def nfl_season_year(settings: Settings) -> int:
    if settings.sportradar_nfl_season_year is not None:
        return int(settings.sportradar_nfl_season_year)
    return default_nfl_season_year()


def nba_season_year(settings: Settings) -> int:
    if settings.sportradar_nba_season_year is not None:
        return int(settings.sportradar_nba_season_year)
    return default_nba_season_year()


def _access_level(settings: Settings) -> str:
    access = (settings.sportradar_access_level or "trial").lower()
    return access if access in ("trial", "production") else "trial"


def _parse_scheduled(raw: str | None) -> datetime | None:
    if not raw or not isinstance(raw, str):
        return None
    try:
        s = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _map_us_game_status(status: str | None) -> str:
    st = (status or "scheduled").lower()
    if st in ("closed", "complete", "completed"):
        return "finished"
    if st in ("inprogress", "halftime", "live"):
        return "live"
    if st in ("cancelled", "canceled", "postponed", "delayed"):
        return "scheduled"
    return "scheduled"


def _team_comp(side: dict[str, Any]) -> dict[str, Any]:
    """Shape Sportradar home/away into soccer-sync competitor dict."""
    alias = side.get("alias") or side.get("abbreviation")
    abbr = alias.strip()[:10] if isinstance(alias, str) and alias.strip() else None
    name = side.get("name")
    display = name.strip()[:255] if isinstance(name, str) and name.strip() else "Unknown"
    return {"abbreviation": abbr, "name": display, "qualifier": "home"}


def normalize_us_schedule_game(game: dict[str, Any]) -> dict[str, Any] | None:
    gid = game.get("id")
    if not gid or not isinstance(gid, str):
        return None
    home_raw = game.get("home")
    away_raw = game.get("away")
    if not isinstance(home_raw, dict) or not isinstance(away_raw, dict):
        return None
    start = _parse_scheduled(game.get("scheduled"))
    if start is None:
        return None

    venue_name = None
    venue_obj = game.get("venue")
    if isinstance(venue_obj, dict):
        vn = venue_obj.get("name")
        if isinstance(vn, str) and vn.strip():
            venue_name = vn.strip()[:255]

    scoring = game.get("scoring")
    hs, aws = 0, 0
    if isinstance(scoring, dict):
        try:
            hs = int(scoring.get("home_points") or 0)
        except (TypeError, ValueError):
            hs = 0
        try:
            aws = int(scoring.get("away_points") or 0)
        except (TypeError, ValueError):
            aws = 0
    else:
        try:
            hs = int(game.get("home_points") or 0)
        except (TypeError, ValueError):
            hs = 0
        try:
            aws = int(game.get("away_points") or 0)
        except (TypeError, ValueError):
            aws = 0

    home = _team_comp(home_raw)
    home["qualifier"] = "home"
    away = _team_comp(away_raw)
    away["qualifier"] = "away"

    return {
        "sport_event_id": gid.strip(),
        "scheduled_time": start,
        "game_status": _map_us_game_status(game.get("status") if isinstance(game.get("status"), str) else None),
        "home_score": hs,
        "away_score": aws,
        "venue": venue_name,
        "home": home,
        "away": away,
    }


def iter_schedule_games(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten NFL weeks[] or NBA top-level games[]."""
    out: list[dict[str, Any]] = []
    weeks = payload.get("weeks")
    if isinstance(weeks, list):
        for wk in weeks:
            if not isinstance(wk, dict):
                continue
            games = wk.get("games")
            if isinstance(games, list):
                out.extend(g for g in games if isinstance(g, dict))
    games = payload.get("games")
    if isinstance(games, list):
        out.extend(g for g in games if isinstance(g, dict))
    return out


def _fetch_schedule_json(
    settings: Settings, league: UsLeague, year: int, season_type: str = "REG"
) -> dict[str, Any] | None:
    key = (settings.sportradar_api_key or "").strip()
    if not key:
        return None
    access = _access_level(settings)
    base = settings.sportradar_api_url.rstrip("/")
    if league == "nfl":
        path = f"/nfl/official/{access}/v7/en/games/{year}/{season_type}/schedule.json"
    else:
        path = f"/nba/{access}/v8/en/games/{year}/{season_type}/schedule.json"
    url = base + path
    req = urllib.request.Request(url, headers={"x-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        logger.debug("Sportradar %s schedule %s/%s HTTP %s", league, year, season_type, e.code)
        return None
    except Exception as e:
        logger.debug("Sportradar %s schedule fetch failed: %s", league, e)
        return None


def upsert_us_game_from_fixture(
    db: Session,
    league: UsLeague,
    home_team,
    away_team,
    fixture: dict[str, Any],
) -> None:
    gid = us_game_id_to_uuid(league, fixture["sport_event_id"])
    g = db.get(Game, gid)
    venue = fixture.get("venue")
    if g is None:
        g = Game(
            id=gid,
            league=league,
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            scheduled_time=fixture["scheduled_time"],
            status=fixture["game_status"],
            home_score=fixture["home_score"],
            away_score=fixture["away_score"],
            venue=venue,
        )
        db.add(g)
    else:
        g.scheduled_time = fixture["scheduled_time"]
        g.status = fixture["game_status"]
        g.home_score = fixture["home_score"]
        g.away_score = fixture["away_score"]
        g.venue = venue
        g.home_team_id = home_team.id
        g.away_team_id = away_team.id
        g.league = league


@dataclass
class UsScheduleSyncResult:
    league: UsLeague
    season_year: int
    season_type: str
    rows_fetched: int = 0
    games_upserted: int = 0
    rows_skipped: int = 0
    errors: list[str] = field(default_factory=list)


def sync_us_schedule(
    db: Session,
    league: UsLeague,
    settings: Settings,
    *,
    season_type: str = "REG",
) -> UsScheduleSyncResult:
    year = nfl_season_year(settings) if league == "nfl" else nba_season_year(settings)
    out = UsScheduleSyncResult(league=league, season_year=year, season_type=season_type)
    if not (settings.sportradar_api_key or "").strip():
        out.errors.append("SPORTRADAR_API_KEY not set")
        return out

    payload = _fetch_schedule_json(settings, league, year, season_type)
    if not payload:
        out.errors.append(f"schedule fetch failed for {league} {year}/{season_type}")
        return out

    rows = iter_schedule_games(payload)
    out.rows_fetched = len(rows)

    for raw in rows:
        fixture = normalize_us_schedule_game(raw)
        if not fixture:
            out.rows_skipped += 1
            continue
        try:
            ht = get_or_create_team(db, league, fixture["home"])
            at = get_or_create_team(db, league, fixture["away"])
            upsert_us_game_from_fixture(db, league, ht, at, fixture)
            out.games_upserted += 1
        except Exception as e:
            logger.exception("us schedule sync failed league=%s id=%s", league, fixture.get("sport_event_id"))
            out.errors.append(f"{fixture.get('sport_event_id')}: {e}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        out.errors.append(f"commit failed: {e}")
        logger.exception("us schedule sync commit failed league=%s", league)

    return out


def sync_all_us_schedules(db: Session, settings: Settings) -> list[UsScheduleSyncResult]:
    return [
        sync_us_schedule(db, "nfl", settings),
        sync_us_schedule(db, "nba", settings),
    ]
