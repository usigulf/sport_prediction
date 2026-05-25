"""
Upsert `team_standings` from Sportradar season standings (same season ids as schedules).

Run after schedule sync so `teams` rows exist to match competitor abbreviation/name.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.config import Settings
from app.models.team import Team
from app.models.team_standing import TeamStanding
from app.services.sportradar_soccer_service import (
    fetch_soccer_standings_json,
    flatten_soccer_standings_rows,
    soccer_season_id_for_league,
)

logger = logging.getLogger(__name__)


def _norm_name(s: str) -> str:
    return (s or "").casefold().strip()


@dataclass
class SoccerStandingsSyncResult:
    app_league: str
    season_id: str
    rows_seen: int = 0
    upserted: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)


def _match_team(db: Session, app_league: str, teams_cache: list[Team], abbr: str | None, name: str) -> Team | None:
    a = (abbr or "").strip().upper()
    nm = _norm_name(name)
    if a:
        for t in teams_cache:
            if t.abbreviation and t.abbreviation.strip().upper() == a:
                return t
    if nm:
        for t in teams_cache:
            if _norm_name(t.name) == nm:
                return t
            if nm in _norm_name(t.name) or _norm_name(t.name) in nm:
                return t
    return None


def sync_soccer_standings_for_league(db: Session, app_league: str, settings: Settings) -> SoccerStandingsSyncResult:
    season_id = (soccer_season_id_for_league(app_league, settings) or "").strip()
    out = SoccerStandingsSyncResult(app_league=app_league, season_id=season_id)
    if not season_id:
        out.errors.append("season_id not configured for this league")
        return out
    if not (settings.sportradar_api_key or "").strip():
        out.errors.append("SPORTRADAR_API_KEY not set")
        return out

    data, _ = fetch_soccer_standings_json(settings, season_id)
    if not data:
        out.errors.append("standings fetch failed or empty")
        return out

    flat = flatten_soccer_standings_rows(data)
    out.rows_seen = len(flat)
    teams_cache = db.query(Team).filter(Team.league == app_league).all()

    for row in flat:
        comp = row.get("competitor") if isinstance(row.get("competitor"), dict) else {}
        ab = comp.get("abbreviation") if isinstance(comp.get("abbreviation"), str) else None
        cname = comp.get("name") if isinstance(comp.get("name"), str) else ""
        team = _match_team(db, app_league, teams_cache, ab, cname)
        if not team:
            out.skipped += 1
            continue
        try:
            w = int(row.get("win") or 0)
            d = int(row.get("draw") or 0)
            l = int(row.get("loss") or 0)
        except (TypeError, ValueError):
            out.skipped += 1
            continue
        played = w + d + l
        if played < 0:
            out.skipped += 1
            continue
        try:
            rk = int(row.get("rank") or 999)
        except (TypeError, ValueError):
            rk = 999
        pts_raw = row.get("points")
        try:
            pts = int(pts_raw) if pts_raw is not None else None
        except (TypeError, ValueError):
            pts = None
        if pts is None:
            pts = 3 * w + d
        try:
            gf = int(row["goals_for"]) if row.get("goals_for") is not None else None
        except (TypeError, ValueError):
            gf = None
        try:
            ga = int(row["goals_against"]) if row.get("goals_against") is not None else None
        except (TypeError, ValueError):
            ga = None

        existing = (
            db.query(TeamStanding)
            .filter(
                TeamStanding.league == app_league,
                TeamStanding.team_id == team.id,
            )
            .first()
        )
        if existing:
            existing.league_rank = rk
            existing.played = played
            existing.wins = w
            existing.draws = d
            existing.losses = l
            existing.points = pts
            existing.goals_for = gf
            existing.goals_against = ga
        else:
            db.add(
                TeamStanding(
                    league=app_league,
                    team_id=team.id,
                    league_rank=rk,
                    played=played,
                    wins=w,
                    draws=d,
                    losses=l,
                    points=pts,
                    goals_for=gf,
                    goals_against=ga,
                )
            )
        out.upserted += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        out.errors.append(f"commit failed: {e}")
        logger.exception("soccer standings sync commit failed")

    return out
