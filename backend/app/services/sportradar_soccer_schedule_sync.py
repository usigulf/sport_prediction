"""
Upsert Premier League / Champions League games from Sportradar season schedules.

Game.id is uuid5(sport_event_id) so repeated syncs update the same row.
Call POST /internal/soccer/sync-schedules with X-Cron-Secret, then POST /internal/predictions/run
to refresh predictions for upcoming/live fixtures.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.models.game import Game
from app.models.team import Team
from app.services.sportradar_soccer_service import (
    fetch_season_schedule_summaries,
    soccer_season_id_for_league,
)

logger = logging.getLogger(__name__)

# Deterministic game primary keys from Sportradar sport_event id
_SPORT_EVENT_UUID_NS = uuid.uuid5(uuid.NAMESPACE_URL, "https://developer.sportradar.com/soccer/sport_event")


def sport_event_id_to_game_uuid(sport_event_id: str) -> uuid.UUID:
    return uuid.uuid5(_SPORT_EVENT_UUID_NS, sport_event_id.strip())


def _parse_start_time(raw: str | None) -> datetime | None:
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


def _map_sportradar_status(sport_event_status: dict[str, Any]) -> str:
    st = (sport_event_status.get("status") or "not_started")
    st_l = st.lower() if isinstance(st, str) else "not_started"
    match_st = sport_event_status.get("match_status")
    m_l = match_st.lower() if isinstance(match_st, str) else ""
    if st_l == "ended" or m_l == "ended":
        return "finished"
    if st_l == "live":
        return "live"
    return "scheduled"


def normalize_schedule_row(row: dict[str, Any]) -> dict[str, Any] | None:
    """Build a dict suitable for DB upsert, or None if row is not a two-team fixture."""
    se = row.get("sport_event")
    if not isinstance(se, dict):
        return None
    ses = row.get("sport_event_status")
    if not isinstance(ses, dict):
        ses = {}

    eid = se.get("id")
    if not eid or not isinstance(eid, str):
        return None

    comps = se.get("competitors") or []
    if not isinstance(comps, list):
        return None
    home = next((c for c in comps if isinstance(c, dict) and c.get("qualifier") == "home"), None)
    away = next((c for c in comps if isinstance(c, dict) and c.get("qualifier") == "away"), None)
    if not home or not away:
        return None
    if home.get("virtual") or away.get("virtual"):
        return None

    start = _parse_start_time(se.get("start_time"))
    if start is None:
        return None

    venue_obj = se.get("venue")
    venue_name = None
    if isinstance(venue_obj, dict):
        n = venue_obj.get("name")
        if isinstance(n, str) and n.strip():
            venue_name = n.strip()[:255]

    try:
        hs = int(ses.get("home_score") or 0)
    except (TypeError, ValueError):
        hs = 0
    try:
        aws = int(ses.get("away_score") or 0)
    except (TypeError, ValueError):
        aws = 0

    return {
        "sport_event_id": eid.strip(),
        "scheduled_time": start,
        "game_status": _map_sportradar_status(ses),
        "home_score": hs,
        "away_score": aws,
        "venue": venue_name,
        "home": home,
        "away": away,
    }


def _abbr(comp: dict[str, Any]) -> str | None:
    a = comp.get("abbreviation")
    if isinstance(a, str) and a.strip():
        return a.strip()[:10]
    return None


def _team_display_name(comp: dict[str, Any]) -> str:
    n = comp.get("name")
    if isinstance(n, str) and n.strip():
        return n.strip()[:255]
    return "Unknown"


def get_or_create_team(db: Session, app_league: str, comp: dict[str, Any]) -> Team:
    abbr = _abbr(comp)
    name = _team_display_name(comp)
    q = db.query(Team).filter(Team.league == app_league)
    if abbr:
        existing = q.filter(Team.abbreviation == abbr).first()
        if existing:
            return existing
    else:
        existing = q.filter(Team.name == name).first()
        if existing:
            return existing
    team = Team(name=name, league=app_league, abbreviation=abbr)
    db.add(team)
    db.flush()
    return team


def upsert_game_from_fixture(
    db: Session,
    app_league: str,
    home_team: Team,
    away_team: Team,
    fixture: dict[str, Any],
) -> None:
    gid = sport_event_id_to_game_uuid(fixture["sport_event_id"])
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


@dataclass
class SoccerScheduleSyncResult:
    app_league: str
    season_id: str
    rows_fetched: int = 0
    games_upserted: int = 0
    rows_skipped: int = 0
    errors: list[str] = field(default_factory=list)


def sync_soccer_schedule_for_league(db: Session, app_league: str, settings: Settings) -> SoccerScheduleSyncResult:
    season_id = (soccer_season_id_for_league(app_league, settings) or "").strip()
    out = SoccerScheduleSyncResult(app_league=app_league, season_id=season_id)
    if not season_id:
        out.errors.append("season_id not configured for this league")
        return out
    if not (settings.sportradar_api_key or "").strip():
        out.errors.append("SPORTRADAR_API_KEY not set")
        return out

    rows = fetch_season_schedule_summaries(settings, season_id)
    out.rows_fetched = len(rows)

    for raw in rows:
        fixture = normalize_schedule_row(raw)
        if not fixture:
            out.rows_skipped += 1
            continue
        try:
            ht = get_or_create_team(db, app_league, fixture["home"])
            at = get_or_create_team(db, app_league, fixture["away"])
            upsert_game_from_fixture(db, app_league, ht, at, fixture)
            out.games_upserted += 1
        except Exception as e:
            logger.exception("soccer sync row failed sport_event_id=%s", fixture.get("sport_event_id"))
            out.errors.append(f"{fixture.get('sport_event_id')}: {e}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        out.errors.append(f"commit failed: {e}")
        logger.exception("soccer sync commit failed")

    return out
