"""
Build model feature vectors from DB game rows.
For dev/demo we add a small time-bucket drift so repeated prediction refreshes
can change outputs even before a real data feed is connected.

Replace this module with provider-backed stats when your data pipeline is live.
"""
from __future__ import annotations

import random
from datetime import datetime, timezone
from uuid import UUID

from app.models.game import Game


def _seed_from_uuid(game_id: UUID) -> int:
    return int(game_id.hex[:8], 16) % (2**31)

def _time_bucket(game: Game) -> int:
    """
    Return a coarse time bucket to introduce drift in dev/demo.
    For both live and scheduled games, update every ~30s so repeated job runs
    can visibly move probabilities during local testing.
    """
    now = datetime.now(timezone.utc).timestamp()
    return int(now // 30)

def build_feature_dict(game: Game) -> dict[str, float | int]:
    # Base seed keeps games distinct; time bucket adds drift across refreshes.
    rng = random.Random(_seed_from_uuid(game.id) ^ _time_bucket(game))
    features: dict[str, float | int] = {
        "home_team_win_rate": round(rng.uniform(0.35, 0.72), 4),
        "away_team_win_rate": round(rng.uniform(0.35, 0.72), 4),
        "home_team_avg_score": round(rng.uniform(20, 30), 4),
        "away_team_avg_score": round(rng.uniform(20, 30), 4),
        "home_team_recent_form": round(rng.uniform(0.25, 0.85), 4),
        "away_team_recent_form": round(rng.uniform(0.25, 0.85), 4),
        "home_advantage": round(rng.uniform(0.02, 0.12), 4),
        "rest_days_home": rng.randint(2, 7),
        "rest_days_away": rng.randint(2, 7),
    }
    if game.status == "live":
        margin = (game.home_score or 0) - (game.away_score or 0)
        bump = max(-0.22, min(0.22, margin * 0.035))
        features["home_team_recent_form"] = round(
            min(0.95, float(features["home_team_recent_form"]) + bump), 4
        )
        features["away_team_recent_form"] = round(
            max(0.05, float(features["away_team_recent_form"]) - bump * 0.85), 4
        )
    return features


# Baseline expected totals / goals per league (for translating probs → display scores)
_LEAGUE_SCORE_BASE: dict[str, tuple[float, float]] = {
    "nfl": (24.0, 21.0),
    "nba": (112.0, 108.0),
    "mlb": (4.5, 4.2),
    "nhl": (3.0, 2.7),
    "premier_league": (1.65, 1.35),
    "champions_league": (1.7, 1.4),
    "boxing": (7.0, 6.0),
    "tennis": (2.0, 1.2),
    "golf": (70.0, 71.0),
    "mma": (2.2, 1.6),
}


def expected_scores_for_league(league: str, home_win_p: float) -> tuple[float, float]:
    base_h, base_a = _LEAGUE_SCORE_BASE.get(league, (2.0, 1.8))
    edge = (home_win_p - 0.5) * 2.0
    if league in ("nba", "nfl", "nhl"):
        shift = edge * 4.0
        return round(base_h + shift, 2), round(base_a - shift * 0.85, 2)
    if league == "mlb":
        shift = edge * 1.2
        return round(base_h + shift, 2), round(base_a - shift * 0.9, 2)
    if league in ("premier_league", "champions_league"):
        shift = edge * 0.55
        return round(max(0.3, base_h + shift), 2), round(max(0.3, base_a - shift * 0.8), 2)
    shift = edge * 1.5
    return round(max(0.2, base_h + shift), 2), round(max(0.2, base_a - shift * 0.85), 2)
