"""
Upsert team_standings from ClearSports team-stats when the payload includes table fields.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.models.team import Team
from app.models.team_standing import TeamStanding
from app.services.clearsports_soccer_service import (
    clearsports_league_slug,
    clearsports_season_for_league,
    fetch_clearsports_team_stats,
)
from app.services.sportradar_soccer_standings_sync import SoccerStandingsSyncResult, _match_team

logger = logging.getLogger(__name__)


def _standing_fields(row: dict[str, Any]) -> tuple[int, int, int, int, int | None] | None:
    """Return rank, wins, draws, losses, points if parseable."""
    try:
        w = int(row.get("wins") or row.get("win") or row.get("W") or 0)
        d = int(row.get("draws") or row.get("draw") or row.get("D") or 0)
        losses = int(row.get("losses") or row.get("loss") or row.get("L") or 0)
        rk = int(row.get("rank") or row.get("position") or row.get("standing") or 999)
    except (TypeError, ValueError):
        return None
    pts_raw = row.get("points") or row.get("pts")
    try:
        pts = int(pts_raw) if pts_raw is not None else None
    except (TypeError, ValueError):
        pts = None
    if w + d + losses <= 0 and pts is None:
        return None
    return rk, w, d, losses, pts


def _team_fields_from_row(row: dict[str, Any]) -> tuple[str | None, str]:
    team = row.get("team")
    if isinstance(team, dict):
        ab = team.get("abbreviation") or team.get("abbr")
        name = team.get("name") or team.get("team_name") or ""
        if isinstance(name, str) and name.strip():
            ab_s = ab.strip()[:10] if isinstance(ab, str) and ab.strip() else None
            return ab_s, name.strip()[:255]
    name = row.get("team_name") or row.get("name")
    ab = row.get("abbreviation") or row.get("abbr")
    if isinstance(name, str) and name.strip():
        ab_s = ab.strip()[:10] if isinstance(ab, str) and ab.strip() else None
        return ab_s, name.strip()[:255]
    return None, ""


def sync_clearsports_soccer_standings_for_league(
    db: Session, app_league: str, settings: Settings
) -> SoccerStandingsSyncResult:
    season = (clearsports_season_for_league(app_league, settings) or "").strip()
    out = SoccerStandingsSyncResult(app_league=app_league, season_id=season)
    if not clearsports_league_slug(app_league):
        out.errors.append("league not supported on ClearSports")
        return out
    if not (settings.clearsports_api_key or "").strip():
        out.errors.append("CLEARSPORTS_API_KEY not set")
        return out

    rows = fetch_clearsports_team_stats(settings, app_league)
    out.rows_seen = len(rows)
    if not rows:
        out.errors.append("team-stats empty or unavailable (standings optional for predictions)")
        return out

    teams_cache = db.query(Team).filter(Team.league == app_league).all()
    for row in rows:
        parsed = _standing_fields(row)
        if not parsed:
            out.skipped += 1
            continue
        rk, w, d, losses, pts = parsed
        ab, name = _team_fields_from_row(row)
        if not name:
            out.skipped += 1
            continue
        team = _match_team(db, app_league, teams_cache, ab, name)
        if not team:
            out.skipped += 1
            continue
        played = w + d + losses
        existing = (
            db.query(TeamStanding)
            .filter(TeamStanding.league == app_league, TeamStanding.team_id == team.id)
            .first()
        )
        if existing:
            existing.league_rank = rk
            existing.wins = w
            existing.draws = d
            existing.losses = losses
            existing.played = played
            existing.points = pts
        else:
            db.add(
                TeamStanding(
                    league=app_league,
                    team_id=team.id,
                    league_rank=rk,
                    wins=w,
                    draws=d,
                    losses=losses,
                    played=played,
                    points=pts,
                )
            )
        out.upserted += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        out.errors.append(f"commit failed: {e}")
        logger.exception("clearsports standings commit failed")

    return out
