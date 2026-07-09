"""Model vs market summary for dashboard (I64 / W32)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.services.odds_service import get_market_odds_for_game
from app.services.trust_metrics_service import aggregate_accuracy_from_finished


def build_model_vs_market_summary(db: Session, *, upcoming_limit: int = 15) -> dict[str, Any]:
    """
    Aggregate model accuracy plus live model-vs-market edges on upcoming games.
    Historical closing lines are not stored in DB — backtest market benchmark is separate.
    """
    now = datetime.now(timezone.utc)
    since_30d = now.replace(tzinfo=None) - timedelta(days=30)
    accuracy_all = aggregate_accuracy_from_finished(db, since=None)
    accuracy_30d = aggregate_accuracy_from_finished(db, since=since_30d)

    upcoming = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.status == "scheduled", Game.scheduled_time >= now.replace(tzinfo=None))
        .order_by(Game.scheduled_time.asc())
        .limit(min(upcoming_limit, 30))
        .all()
    )

    edges: list[dict[str, Any]] = []
    odds_available = 0
    edge_pcts: list[float] = []

    for game in upcoming:
        odds = get_market_odds_for_game(db, game)
        if not odds.get("available"):
            continue
        comparison = (odds.get("model_comparison") or {})
        edge = comparison.get("home_edge_pct")
        if edge is None:
            continue
        odds_available += 1
        edge_f = float(edge)
        edge_pcts.append(abs(edge_f))
        home = game.home_team.name if game.home_team else "Home"
        away = game.away_team.name if game.away_team else "Away"
        edges.append(
            {
                "game_id": str(game.id),
                "league": game.league,
                "matchup": f"{home} vs {away}",
                "scheduled_time": game.scheduled_time.isoformat() if game.scheduled_time else None,
                "model_home_win_prob": comparison.get("model_home_win_prob"),
                "market_home_implied_prob": comparison.get("market_home_implied_prob"),
                "home_edge_pct": edge_f,
                "edge_label": comparison.get("edge_label"),
            }
        )

    avg_abs_edge = round(sum(edge_pcts) / len(edge_pcts), 2) if edge_pcts else None

    return {
        "computed_at_iso": now.isoformat(),
        "disclaimer": (
            "Informational only — not betting advice. Market lines are consensus snapshots; "
            "we do not store historical closing lines for CLV yet."
        ),
        "model_accuracy_all_time": accuracy_all,
        "model_accuracy_rolling_30d": accuracy_30d,
        "upcoming_with_odds": odds_available,
        "upcoming_sampled": len(upcoming),
        "avg_abs_home_edge_pct": avg_abs_edge,
        "upcoming_edges": edges[:10],
    }
