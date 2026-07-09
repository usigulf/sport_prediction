"""Parlay leg correlation warnings (I66) — informational risk flags, not betting advice."""
from __future__ import annotations

from collections import Counter
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.models.game import Game

DISCLAIMER = (
    "Informational correlation flags only — not betting advice. "
    "Correlated legs reduce independent probability; sportsbooks may reject some combinations."
)


def _parse_game_ids(game_ids: list[str]) -> list[UUID]:
    out: list[UUID] = []
    for raw in game_ids:
        out.append(UUID(str(raw)))
    return out


def analyze_parlay_correlation(db: Session, game_ids: list[str]) -> dict[str, Any]:
    """
    Flag structural correlation risks when multiple game legs are combined.
    Does not compute parlay odds or EV.
    """
    if not game_ids:
        return {
            "legs": 0,
            "warnings": [],
            "risk_level": "low",
            "disclaimer": DISCLAIMER,
        }

    if len(game_ids) > 16:
        raise ValueError("At most 16 legs per check")

    uuids = _parse_game_ids(game_ids)
    games = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id.in_(uuids))
        .all()
    )
    by_id = {g.id: g for g in games}

    warnings: list[dict[str, Any]] = []

    if len(uuids) > len(set(uuids)):
        warnings.append(
            {
                "code": "duplicate_leg",
                "severity": "high",
                "message": "The same game appears more than once in this slip.",
            }
        )

    if len(games) < len(set(uuids)):
        warnings.append(
            {
                "code": "unknown_game",
                "severity": "medium",
                "message": "One or more game IDs were not found.",
            }
        )

    team_counts: Counter = Counter()
    league_counts: Counter = Counter()
    for g in games:
        league_counts[(g.league or "").lower()] += 1
        team_counts[g.home_team_id] += 1
        team_counts[g.away_team_id] += 1

    for team_id, count in team_counts.items():
        if count >= 2:
            warnings.append(
                {
                    "code": "shared_team",
                    "severity": "high",
                    "message": "Multiple legs involve the same team — outcomes are correlated.",
                    "team_id": str(team_id),
                    "leg_count": count,
                }
            )

    for league, count in league_counts.items():
        if league and count >= 3:
            warnings.append(
                {
                    "code": "same_league_cluster",
                    "severity": "medium",
                    "message": f"{count} legs in the same league ({league}) — variance may be correlated.",
                    "league": league,
                    "leg_count": count,
                }
            )

    if len(games) >= 2:
        seen_pairs: set[tuple[str, str]] = set()
        for i, g1 in enumerate(games):
            for g2 in games[i + 1 :]:
                if g1.id == g2.id:
                    continue
                pair = tuple(sorted((str(g1.id), str(g2.id))))
                if pair in seen_pairs:
                    continue
                shared = {g1.home_team_id, g1.away_team_id} & {g2.home_team_id, g2.away_team_id}
                if shared:
                    seen_pairs.add(pair)
                    warnings.append(
                        {
                            "code": "cross_game_team_overlap",
                            "severity": "medium",
                            "message": "Two different games share a team (e.g. back-to-back or related slate).",
                            "game_ids": list(pair),
                        }
                    )

    severities = [w.get("severity") for w in warnings]
    if "high" in severities:
        risk = "high"
    elif "medium" in severities:
        risk = "medium"
    elif warnings:
        risk = "low"
    else:
        risk = "none"

    return {
        "legs": len(game_ids),
        "games_resolved": len(games),
        "warnings": warnings,
        "risk_level": risk,
        "disclaimer": DISCLAIMER,
    }
