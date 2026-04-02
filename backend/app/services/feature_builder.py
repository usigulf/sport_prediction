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


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def _league_label(league: str) -> str:
    return league.replace("_", " ").title() if league else "League"


def build_rich_analysis_dict(game: Game, features: dict[str, float | int]) -> dict[str, str]:
    """
    Narrative sections derived from the same feature vector as the model (refreshes on each job run).
    Not a substitute for verified standings/H2H/player APIs—those lines are explicit where missing.
    """
    home = game.home_team.name if getattr(game, "home_team", None) else "Home"
    away = game.away_team.name if getattr(game, "away_team", None) else "Away"
    league_lbl = _league_label(game.league)

    h_wr = float(features["home_team_win_rate"])
    a_wr = float(features["away_team_win_rate"])
    h_form = float(features["home_team_recent_form"])
    a_form = float(features["away_team_recent_form"])
    h_pts = float(features["home_team_avg_score"])
    a_pts = float(features["away_team_avg_score"])
    rest_h = int(features["rest_days_home"])
    rest_a = int(features["rest_days_away"])
    adv = float(features["home_advantage"])

    form_gap = h_form - a_form
    wr_gap = h_wr - a_wr
    rest_gap = rest_h - rest_a

    # Real-time / state
    if game.status == "live":
        hs = game.home_score or 0
        as_ = game.away_score or 0
        margin = hs - as_
        if margin > 0:
            mom = f"{home} leads on the scoreboard; the model tilts recent-form weight slightly toward the home side."
        elif margin < 0:
            mom = f"{away} leads on the scoreboard; the model tilts recent-form weight slightly toward the away side."
        else:
            mom = "Level scoreline; momentum from margin is neutral in the live adjustment."
        real_time = (
            f"{league_lbl} · LIVE · {home} {hs}–{as_} {away}. {mom} "
            f"Probabilities and this text refresh as new model runs land (typically every few minutes while live)."
        )
    else:
        real_time = (
            f"{league_lbl} · {game.status.upper()}. Snapshot uses the latest feature pull for this matchup. "
            f"While the game is live, score-driven adjustments apply automatically on each refresh."
        )

    # Form & “standings” proxy
    form_standings = (
        f"• Season win-rate inputs: {home} {_pct(h_wr)} vs {away} {_pct(a_wr)} (model priors, not official tables).\n"
        f"• Recent-form index: {home} {_pct(h_form)} vs {away} {_pct(a_form)} "
        f"({'home edge' if form_gap > 0.02 else 'away edge' if form_gap < -0.02 else 'even'}).\n"
        f"• Rest: {home} {rest_h}d vs {away} {rest_a}d ({'extra rest home' if rest_gap >= 2 else 'extra rest away' if rest_gap <= -2 else 'similar'}).\n"
        f"League table ranks require a standings feed; numbers above drive the current pick."
    )

    # H2H-style = strength contrast (honest about data limits)
    if wr_gap > 0.04:
        prof = f"{home} grades stronger on season win-rate inputs; {away} needs a form spike to flip the profile."
    elif wr_gap < -0.04:
        prof = f"{away} grades stronger on season win-rate inputs; {home} relies more on home/venue bump."
    else:
        prof = "Win-rate inputs are tight—this projects as a competitive, thin-margin matchup."

    head_to_head = (
        f"Strength contrast (from model inputs, not a verified H2H log): {prof} "
        f"Recent-form gap ({form_gap:+.3f}) hints at short-term momentum vs season-long level.\n"
        f"Official head-to-head records (last meetings, goals, etc.) appear once historical fixtures are connected."
    )

    off_tilt = "even"
    if h_pts > a_pts + 1.5:
        off_tilt = f"{home}'s offensive environment (avg {h_pts:.1f}) runs hotter than {away} ({a_pts:.1f}) in inputs."
    elif a_pts > h_pts + 1.5:
        off_tilt = f"{away}'s offensive environment (avg {a_pts:.1f}) runs hotter than {home} ({h_pts:.1f}) in inputs."
    else:
        off_tilt = f"Scoring inputs are close ({h_pts:.1f} vs {a_pts:.1f})—game script could swing either way."

    key_players = (
        f"Performer context is inferred from team offensive inputs: {off_tilt} "
        f"Named player props and injury-adjusted roles need a player-level feed.\n"
        f"Watchlist: whichever side defends the efficiency battle likely covers the tighter number."
    )

    tact = (
        f"Home-field / venue bump in model: +{adv:.3f} on home win logit scale. "
        f"Rest differential ({rest_gap:+d} days) nudges stamina/rotation edges. "
        f"{game.venue or 'Venue TBD'} — tactical notes deepen when lineups and pace stats are wired in."
    )

    return {
        "real_time_analysis": real_time.strip(),
        "form_standings": form_standings.strip(),
        "head_to_head": head_to_head.strip(),
        "key_players": key_players.strip(),
        "tactical": tact.strip(),
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
