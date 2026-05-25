"""
Upsert soccer games from ClearSports league game feeds (EPL, La Liga, …).
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.services.clearsports_soccer_service import (
    clearsports_league_slug,
    clearsports_season_for_league,
    fetch_clearsports_games,
)
from app.services.sportradar_soccer_schedule_sync import (
    SoccerScheduleSyncResult,
    get_or_create_team,
    upsert_game_from_fixture,
)

logger = logging.getLogger(__name__)

_CS_GAME_UUID_NS = uuid.uuid5(uuid.NAMESPACE_URL, "https://api.clearsportsapi.com/game")


def clearsports_game_id_to_uuid(league_slug: str, external_id: str) -> uuid.UUID:
    return uuid.uuid5(_CS_GAME_UUID_NS, f"{league_slug}:{external_id}".strip())


def _parse_start_time(raw: Any) -> datetime | None:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw if raw.tzinfo else raw.replace(tzinfo=timezone.utc)
    if not isinstance(raw, str) or not raw.strip():
        return None
    try:
        s = raw.strip().replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _map_clearsports_status(raw: Any) -> str:
    st = (raw or "").lower() if isinstance(raw, str) else ""
    if st in ("final", "finished", "completed", "ended", "ft"):
        return "finished"
    if st in ("live", "inprogress", "in_progress", "halftime", "1h", "2h"):
        return "live"
    return "scheduled"


def _team_competitor(obj: Any) -> dict[str, Any] | None:
    if not isinstance(obj, dict):
        return None
    name = obj.get("name") or obj.get("team_name") or obj.get("display_name")
    if not isinstance(name, str) or not name.strip():
        return None
    abbr = obj.get("abbreviation") or obj.get("abbr") or obj.get("short_name")
    comp: dict[str, Any] = {"name": name.strip()[:255]}
    if isinstance(abbr, str) and abbr.strip():
        comp["abbreviation"] = abbr.strip()[:10]
    tid = obj.get("id") or obj.get("team_id")
    if tid is not None:
        comp["id"] = str(tid)
    for logo_key in ("logo", "avatar", "image", "logo_url"):
        v = obj.get(logo_key)
        if isinstance(v, str) and v.startswith(("http://", "https://")):
            comp["logo"] = v[:500]
            break
    return comp


def _extract_team(game: dict[str, Any], side: str) -> dict[str, Any] | None:
    for key in (f"{side}_team", f"{side}Team", side):
        t = _team_competitor(game.get(key))
        if t:
            return t
    teams = game.get("teams")
    if isinstance(teams, list):
        for t in teams:
            if not isinstance(t, dict):
                continue
            role = (t.get("home_away") or t.get("qualifier") or t.get("side") or "").lower()
            if role == side or (side == "home" and role == "h") or (side == "away" and role == "a"):
                return _team_competitor(t)
    return None


def _game_external_id(game: dict[str, Any]) -> str | None:
    for key in ("id", "game_id", "gameId", "external_id", "fixture_id"):
        v = game.get(key)
        if v is not None and str(v).strip():
            return str(v).strip()
    return None


def normalize_clearsports_game(game: dict[str, Any], league_slug: str) -> dict[str, Any] | None:
    gid = _game_external_id(game)
    if not gid:
        return None
    home = _extract_team(game, "home")
    away = _extract_team(game, "away")
    if not home or not away:
        return None
    start = _parse_start_time(
        game.get("start_time")
        or game.get("scheduled_at")
        or game.get("scheduled_time")
        or game.get("date_time")
        or game.get("game_time")
        or game.get("date")
    )
    if start is None:
        return None
    try:
        hs = int(game.get("home_score") or game.get("homeScore") or 0)
    except (TypeError, ValueError):
        hs = 0
    try:
        aws = int(game.get("away_score") or game.get("awayScore") or 0)
    except (TypeError, ValueError):
        aws = 0
    score = game.get("score")
    if isinstance(score, dict):
        try:
            hs = int(score.get("home") or score.get("home_score") or hs)
            aws = int(score.get("away") or score.get("away_score") or aws)
        except (TypeError, ValueError):
            pass
    venue = None
    vobj = game.get("venue") or game.get("stadium")
    if isinstance(vobj, dict):
        vn = vobj.get("name")
        if isinstance(vn, str) and vn.strip():
            venue = vn.strip()[:255]
    elif isinstance(vobj, str) and vobj.strip():
        venue = vobj.strip()[:255]

    return {
        "sport_event_id": f"clearsports:{league_slug}:{gid}",
        "scheduled_time": start,
        "game_status": _map_clearsports_status(game.get("status") or game.get("game_status")),
        "home_score": hs,
        "away_score": aws,
        "venue": venue,
        "home": home,
        "away": away,
        "_clearsports_uuid": clearsports_game_id_to_uuid(league_slug, gid),
    }


def _upsert_game_clearsports(
    db: Session,
    app_league: str,
    home_team,
    away_team,
    fixture: dict[str, Any],
) -> None:
    """Same as upsert_game_from_fixture but uses ClearSports uuid namespace."""
    from app.models.game import Game

    gid = fixture.get("_clearsports_uuid") or clearsports_game_id_to_uuid(
        fixture["sport_event_id"].split(":")[1] if ":" in fixture["sport_event_id"] else app_league,
        fixture["sport_event_id"],
    )
    g = db.get(Game, gid)
    venue = fixture.get("venue")
    if g is None:
        g = Game(
            id=gid,
            league=app_league,
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
        g.league = app_league


def sync_clearsports_soccer_schedule_for_league(
    db: Session, app_league: str, settings: Settings
) -> SoccerScheduleSyncResult:
    slug = clearsports_league_slug(app_league)
    season = (clearsports_season_for_league(app_league, settings) or "").strip()
    out = SoccerScheduleSyncResult(app_league=app_league, season_id=season or slug or "")
    if not slug:
        out.errors.append("league not supported on ClearSports")
        return out
    if not season:
        out.errors.append("season not configured for this league")
        return out
    if not (settings.clearsports_api_key or "").strip():
        out.errors.append("CLEARSPORTS_API_KEY not set")
        return out

    seen: set[str] = set()
    rows: list[dict[str, Any]] = []
    for batch in (
        fetch_clearsports_games(settings, app_league, season=season),
        fetch_clearsports_games(
            settings,
            app_league,
            date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        ),
    ):
        for g in batch:
            eid = _game_external_id(g)
            if not eid or eid in seen:
                continue
            seen.add(eid)
            rows.append(g)
    out.rows_fetched = len(rows)

    for raw in rows:
        fixture = normalize_clearsports_game(raw, slug)
        if not fixture:
            out.rows_skipped += 1
            continue
        try:
            ht = get_or_create_team(db, app_league, fixture["home"])
            at = get_or_create_team(db, app_league, fixture["away"])
            _upsert_game_clearsports(db, app_league, ht, at, fixture)
            out.games_upserted += 1
        except Exception as e:
            logger.exception("clearsports soccer sync failed id=%s", fixture.get("sport_event_id"))
            out.errors.append(f"{fixture.get('sport_event_id')}: {e}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        out.errors.append(f"commit failed: {e}")
        logger.exception("clearsports soccer sync commit failed")

    return out
