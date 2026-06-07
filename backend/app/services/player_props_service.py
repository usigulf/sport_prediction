"""
Model-projected player props from game predictions and optional spotlight player names.

These are internal model estimates — not licensed sportsbook lines or player stat feeds.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game
from app.models.game_player_spotlight import GamePlayerSpotlight
from app.models.prediction import Prediction

PROPS_DISCLAIMER = (
    "Model estimates from team score projections and named spotlight players. "
    "Not sportsbook lines; verified player-stat and odds feeds are not wired yet."
)


def _league_family(league: str) -> str:
    lg = (league or "").lower()
    if lg in SOCCER_LEAGUES_SET:
        return "soccer"
    if lg == "nba":
        return "nba"
    if lg == "nfl":
        return "nfl"
    return "other"


def _confidence(pred: Optional[Prediction]) -> str:
    if not pred or not pred.confidence_level:
        return "medium"
    return pred.confidence_level


def _expected_team_totals(pred: Prediction, game: Game) -> tuple[float, float]:
    if pred.expected_home_score is not None and pred.expected_away_score is not None:
        return float(pred.expected_home_score), float(pred.expected_away_score)

    home_p = float(pred.home_win_probability or 0.5)
    away_p = float(pred.away_win_probability or 0.5)
    family = _league_family(game.league)
    if family == "soccer":
        base = 2.4
        home = max(0.4, base * (home_p / max(home_p + away_p, 0.01)))
        away = max(0.4, base * (away_p / max(home_p + away_p, 0.01)))
        return round(home, 2), round(away, 2)
    if family == "nba":
        base = 224.0
        home = base * 0.5 + (home_p - 0.5) * 18
        away = base - home
        return round(home, 1), round(away, 1)
    if family == "nfl":
        base = 44.0
        home = base * 0.5 + (home_p - 0.5) * 10
        away = base - home
        return round(home, 1), round(away, 1)
    return 1.0, 1.0


def _role_scoring_weight(role: Optional[str]) -> float:
    if not role:
        return 0.35
    r = role.lower()
    if any(k in r for k in ("forward", "striker", "attacker", "winger", "scorer")):
        return 0.55
    if any(k in r for k in ("quarterback", "qb", "passing")):
        return 0.5
    if any(k in r for k in ("running", "rusher", "rb")):
        return 0.42
    if any(k in r for k in ("guard", "wing", "shooting", "point")):
        return 0.45
    if any(k in r for k in ("midfield", "mid")):
        return 0.28
    if any(k in r for k in ("defender", "defence", "defense", "back", "cb")):
        return 0.12
    if "keeper" in r or "goalkeeper" in r:
        return 0.05
    return 0.35


def _team_name_matches(team_label: str, game_team_name: str, abbrev: Optional[str]) -> bool:
    label = (team_label or "").strip().lower()
    name = (game_team_name or "").strip().lower()
    if not label or not name:
        return False
    if label == name or label in name or name in label:
        return True
    if abbrev and label == abbrev.lower():
        return True
    return False


def _side_for_spotlight(spotlight: GamePlayerSpotlight, game: Game) -> Optional[str]:
    home_name = game.home_team.name if game.home_team else ""
    away_name = game.away_team.name if game.away_team else ""
    home_abbr = getattr(game.home_team, "abbreviation", None)
    away_abbr = getattr(game.away_team, "abbreviation", None)
    if _team_name_matches(spotlight.team_name, home_name, home_abbr):
        return "home"
    if _team_name_matches(spotlight.team_name, away_name, away_abbr):
        return "away"
    return None


def _line_from_prediction(value: float) -> float:
    return round(max(0.1, value * 0.94), 1)


def _prop_specs(family: str) -> list[tuple[str, str, float]]:
    if family == "soccer":
        return [("goals", "goals", 1.0), ("shots_on_target", "SOT", 2.8)]
    if family == "nba":
        return [("points", "pts", 1.0), ("rebounds", "reb", 0.42), ("assists", "ast", 0.38)]
    if family == "nfl":
        return [
            ("passing_yards", "yd", 1.0),
            ("rushing_yards", "yd", 0.55),
            ("receptions", "rec", 0.22),
        ]
    return [("points", "pts", 1.0)]


def _build_spotlight_props(
    game: Game,
    pred: Prediction,
    spotlights: list[GamePlayerSpotlight],
) -> list[dict]:
    family = _league_family(game.league)
    home_exp, away_exp = _expected_team_totals(pred, game)
    specs = _prop_specs(family)
    confidence = _confidence(pred)

    by_side: dict[str, list[GamePlayerSpotlight]] = {"home": [], "away": []}
    for row in spotlights:
        side = _side_for_spotlight(row, game)
        if side:
            by_side[side].append(row)

    props: list[dict] = []
    for side, rows in by_side.items():
        if not rows:
            continue
        team_exp = home_exp if side == "home" else away_exp
        team_name = (game.home_team.name if side == "home" else game.away_team.name) or side.title()
        weights = [_role_scoring_weight(r.role) / (r.sort_order + 1) for r in rows]
        total_w = sum(weights) or 1.0

        for row, weight in zip(rows, weights):
            share = weight / total_w
            primary = team_exp * share
            for prop_type, unit, scale in specs[:2]:
                predicted = round(primary * scale, 1)
                if predicted <= 0:
                    continue
                props.append(
                    {
                        "player_name": row.player_name,
                        "team": row.team_name or team_name,
                        "prop_type": prop_type,
                        "predicted_value": predicted,
                        "line": _line_from_prediction(predicted),
                        "unit": unit,
                        "confidence_level": confidence,
                        "source": "spotlight",
                    }
                )
    return props


def _build_team_estimate_props(game: Game, pred: Prediction) -> list[dict]:
    family = _league_family(game.league)
    if family == "other":
        return []

    home_exp, away_exp = _expected_team_totals(pred, game)
    confidence = _confidence(pred)
    specs = _prop_specs(family)
    props: list[dict] = []

    for side, team_exp in (("home", home_exp), ("away", away_exp)):
        team = game.home_team if side == "home" else game.away_team
        if not team:
            continue
        abbrev = (team.abbreviation or team.name[:3] or side).upper()
        prop_type, unit, scale = specs[0]
        predicted = round(team_exp * 0.24 * scale, 1)
        if predicted <= 0:
            continue
        props.append(
            {
                "player_name": f"{abbrev} featured scorer (model est.)",
                "team": team.name,
                "prop_type": prop_type,
                "predicted_value": predicted,
                "line": _line_from_prediction(predicted),
                "unit": unit,
                "confidence_level": confidence,
                "source": "team_estimate",
            }
        )
    return props


def build_game_player_props(db: Session, game: Game, prediction: Optional[Prediction]) -> dict:
    """Return props payload for GET /games/{id}/player-props."""
    if not prediction:
        return {
            "game_id": str(game.id),
            "props": [],
            "count": 0,
            "has_named_players": False,
            "disclaimer": PROPS_DISCLAIMER,
        }

    spotlights = (
        db.query(GamePlayerSpotlight)
        .filter(GamePlayerSpotlight.game_id == game.id)
        .order_by(GamePlayerSpotlight.sort_order.asc(), GamePlayerSpotlight.player_name.asc())
        .all()
    )

    props = _build_spotlight_props(game, prediction, spotlights)
    has_named = bool(props)
    if not props:
        props = _build_team_estimate_props(game, prediction)

    return {
        "game_id": str(game.id),
        "props": props,
        "count": len(props),
        "has_named_players": has_named,
        "disclaimer": PROPS_DISCLAIMER,
    }
