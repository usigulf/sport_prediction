"""
Build model feature vectors from DB game rows.
Soccer: when `team_standings` rows exist for both sides, features use table + recent results.
Other sports: synthetic random features with time-bucket drift for demo refreshes.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game
from app.models.team_standing import TeamStanding

FeatureSource = Literal["synthetic", "soccer_db_standings", "soccer_sportradar_api"]


@dataclass(frozen=True)
class SoccerTableRec:
    wins: int
    draws: int
    losses: int
    goals_for: int
    goals_against: int
    league_rank: int
    points: int

    @property
    def played(self) -> int:
        return max(self.wins + self.draws + self.losses, 1)


def _seed_from_uuid(game_id: UUID) -> int:
    return int(game_id.hex[:8], 16) % (2**31)

def _time_bucket(_game: Game) -> int:
    """
    Return a coarse time bucket to introduce drift in dev/demo.
    For both live and scheduled games, update every ~30s so repeated job runs
    can visibly move probabilities during local testing.
    """
    now = datetime.now(timezone.utc).timestamp()
    return int(now // 30)


def _synthetic_feature_dict(game: Game) -> dict[str, float | int]:
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


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _recent_finished_league_games_for_team(
    db: Session, team_id, league: str, before: datetime | None, limit: int = 5
) -> list[Game]:
    before = _as_utc(before)
    if before is None:
        return []
    return (
        db.query(Game)
        .filter(
            Game.league == league,
            Game.status == "finished",
            Game.scheduled_time < before,
            or_(Game.home_team_id == team_id, Game.away_team_id == team_id),
        )
        .order_by(desc(Game.scheduled_time))
        .limit(limit)
        .all()
    )


def _form_from_recent_games(db: Session, team_id, league: str, before: datetime | None) -> float | None:
    past = _recent_finished_league_games_for_team(db, team_id, league, before, 5)
    if not past:
        return None
    pts = 0.0
    for g in past:
        hs, aws = g.home_score or 0, g.away_score or 0
        if hs == aws:
            pts += 0.5
        elif (g.home_team_id == team_id and hs > aws) or (g.away_team_id == team_id and aws > hs):
            pts += 1.0
    return round(pts / len(past), 4)


def format_recent_wdl_for_matchup(db: Session, game: Game) -> str | None:
    """
    Human-readable last-N W–D–L per side from finished league games in DB before kickoff
    (same window as recent-form index, up to 5 each).
    """
    if not game.home_team or not game.away_team or not game.league:
        return None
    kickoff = _as_utc(game.scheduled_time)
    if kickoff is None:
        return None
    league = game.league
    lines: list[str] = []
    for team_id, name in (
        (game.home_team_id, game.home_team.name),
        (game.away_team_id, game.away_team.name),
    ):
        past = _recent_finished_league_games_for_team(db, team_id, league, kickoff, 5)
        if not past:
            continue
        w = d = l = 0
        for g in past:
            hs, aws = g.home_score or 0, g.away_score or 0
            if hs == aws:
                d += 1
            elif (g.home_team_id == team_id and hs > aws) or (g.away_team_id == team_id and aws > hs):
                w += 1
            else:
                l += 1
        n = len(past)
        lines.append(f"• {name}: {w}W-{d}D-{l}L (last {n} league match(es) in DB)")
    if not lines:
        return None
    lines.append("")
    lines.append("Window: up to 5 most recent finished league fixtures per team before this kickoff.")
    return "\n".join(lines)


def _rest_days_before(db: Session, team_id, league: str, kickoff: datetime | None) -> int:
    kickoff = _as_utc(kickoff)
    if kickoff is None:
        return 4
    g = (
        db.query(Game)
        .filter(
            Game.league == league,
            Game.status == "finished",
            Game.scheduled_time < kickoff,
            or_(Game.home_team_id == team_id, Game.away_team_id == team_id),
        )
        .order_by(desc(Game.scheduled_time))
        .first()
    )
    if not g or not g.scheduled_time:
        return 4
    last_t = _as_utc(g.scheduled_time)
    if last_t is None:
        return 4
    delta = kickoff - last_t
    days = int(delta.total_seconds() / 86400)
    return max(1, min(14, days))


def _rec_from_team_standing(r: TeamStanding) -> SoccerTableRec:
    pts = r.points if r.points is not None else 3 * r.wins + r.draws
    return SoccerTableRec(
        wins=r.wins,
        draws=r.draws,
        losses=r.losses,
        goals_for=r.goals_for or 0,
        goals_against=r.goals_against or 0,
        league_rank=r.league_rank,
        points=int(pts),
    )


def _rec_from_sportradar_row(row: dict) -> SoccerTableRec | None:
    try:
        w = int(row.get("win") if row.get("win") is not None else 0)
        d = int(row.get("draw") if row.get("draw") is not None else 0)
        l = int(row.get("loss") if row.get("loss") is not None else 0)
    except (TypeError, ValueError):
        return None
    rk_raw = row.get("rank")
    try:
        league_rank = int(rk_raw) if rk_raw is not None else 99
    except (TypeError, ValueError):
        league_rank = 99
    try:
        gf = int(row["goals_for"]) if row.get("goals_for") is not None else 0
        ga = int(row["goals_against"]) if row.get("goals_against") is not None else 0
    except (TypeError, ValueError):
        gf, ga = 0, 0
    pts_raw = row.get("points")
    try:
        points = int(pts_raw) if pts_raw is not None else 3 * w + d
    except (TypeError, ValueError):
        points = 3 * w + d
    return SoccerTableRec(
        wins=w,
        draws=d,
        losses=l,
        goals_for=gf,
        goals_against=ga,
        league_rank=league_rank,
        points=points,
    )


def _build_soccer_features_from_recs(
    db: Session,
    game: Game,
    league: str,
    rh: SoccerTableRec,
    ra: SoccerTableRec,
) -> dict[str, float | int]:
    kickoff = _as_utc(game.scheduled_time)

    def win_rate(rec: SoccerTableRec) -> float:
        p = rec.played
        return round((rec.wins + 0.5 * rec.draws) / p, 4)

    def gpg(rec: SoccerTableRec) -> float:
        return round(float(rec.goals_for) / rec.played, 4)

    h_wr = win_rate(rh)
    a_wr = win_rate(ra)
    h_gpg = gpg(rh)
    a_gpg = gpg(ra)

    h_form = _form_from_recent_games(db, game.home_team_id, league, kickoff)
    a_form = _form_from_recent_games(db, game.away_team_id, league, kickoff)
    if h_form is None:
        h_form = h_wr
    if a_form is None:
        a_form = a_wr

    rank_gap = ra.league_rank - rh.league_rank
    home_adv = round(0.045 + 0.008 * max(-4, min(4, rank_gap)), 4)
    home_adv = max(0.02, min(0.13, home_adv))

    rest_h = _rest_days_before(db, game.home_team_id, league, kickoff)
    rest_a = _rest_days_before(db, game.away_team_id, league, kickoff)

    features: dict[str, float | int] = {
        "home_team_win_rate": h_wr,
        "away_team_win_rate": a_wr,
        "home_team_avg_score": h_gpg,
        "away_team_avg_score": a_gpg,
        "home_team_recent_form": h_form,
        "away_team_recent_form": a_form,
        "home_advantage": home_adv,
        "rest_days_home": rest_h,
        "rest_days_away": rest_a,
    }
    if game.status == "live":
        margin = (game.home_score or 0) - (game.away_score or 0)
        bump = max(-0.18, min(0.18, margin * 0.028))
        features["home_team_recent_form"] = round(
            min(0.95, float(features["home_team_recent_form"]) + bump), 4
        )
        features["away_team_recent_form"] = round(
            max(0.05, float(features["away_team_recent_form"]) - bump * 0.85), 4
        )
    return features


def _soccer_features_from_standings(db: Session, game: Game) -> dict[str, float | int] | None:
    league = (game.league or "").lower()
    if league not in SOCCER_LEAGUES_SET or not game.home_team or not game.away_team:
        return None
    rows = (
        db.query(TeamStanding)
        .filter(
            TeamStanding.league == league,
            TeamStanding.team_id.in_([game.home_team_id, game.away_team_id]),
        )
        .all()
    )
    by_id = {r.team_id: r for r in rows}
    if len(by_id) < 2:
        return None
    rh = _rec_from_team_standing(by_id[game.home_team_id])
    ra = _rec_from_team_standing(by_id[game.away_team_id])
    return _build_soccer_features_from_recs(db, game, league, rh, ra)


def _soccer_features_from_sportradar_api(db: Session, game: Game, settings) -> dict[str, float | int] | None:
    """
    When team_standings rows are missing, pull the same season standings from Sportradar
    (cached ~5m in sportradar_soccer_service) so predictions still use table + GF/GA.
    """
    league = (game.league or "").lower()
    if league not in SOCCER_LEAGUES_SET or not game.home_team or not game.away_team:
        return None
    from app.services.sportradar_soccer_service import (
        fetch_soccer_standings_json,
        find_soccer_standing_row,
        flatten_soccer_standings_rows,
        soccer_season_id_for_league,
    )

    season_id = soccer_season_id_for_league(league, settings)
    if not season_id or not (getattr(settings, "sportradar_api_key", "") or "").strip():
        return None
    data, _ = fetch_soccer_standings_json(settings, season_id)
    if not data:
        return None
    flat = flatten_soccer_standings_rows(data)
    if not flat:
        return None
    h = game.home_team
    a = game.away_team
    th = find_soccer_standing_row(flat, h.abbreviation, h.name)
    ta = find_soccer_standing_row(flat, a.abbreviation, a.name)
    if not th or not ta:
        return None
    rh = _rec_from_sportradar_row(th)
    ra = _rec_from_sportradar_row(ta)
    if rh is None or ra is None:
        return None
    return _build_soccer_features_from_recs(db, game, league, rh, ra)


def build_game_features(game: Game, db: Session | None) -> tuple[dict[str, float | int], FeatureSource]:
    if db is not None:
        league = (game.league or "").lower()
        if league in SOCCER_LEAGUES_SET and game.home_team and game.away_team:
            soccer = _soccer_features_from_standings(db, game)
            if soccer is not None:
                return soccer, "soccer_db_standings"
            from app.config import get_settings

            soccer = _soccer_features_from_sportradar_api(db, game, get_settings())
            if soccer is not None:
                return soccer, "soccer_sportradar_api"
    return _synthetic_feature_dict(game), "synthetic"


def build_feature_dict(game: Game, db: Session | None = None) -> dict[str, float | int]:
    return build_game_features(game, db)[0]


# Baseline expected totals / goals per league (for translating probs → display scores)
_LEAGUE_SCORE_BASE: dict[str, tuple[float, float]] = {
    "nfl": (24.0, 21.0),
    "nba": (112.0, 108.0),
    "mlb": (4.5, 4.2),
    "nhl": (3.0, 2.7),
    "premier_league": (1.65, 1.35),
    "champions_league": (1.7, 1.4),
    "la_liga": (1.6, 1.35),
    "serie_a": (1.55, 1.3),
    "bundesliga": (1.75, 1.45),
    "mls": (1.5, 1.35),
    "boxing": (7.0, 6.0),
    "tennis": (2.0, 1.2),
    "golf": (70.0, 71.0),
    "mma": (2.2, 1.6),
}


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def _league_label(league: str) -> str:
    return league.replace("_", " ").title() if league else "League"


def build_rich_analysis_dict(
    game: Game,
    features: dict[str, float | int],
    db: Session | None = None,
    *,
    feature_source: FeatureSource = "synthetic",
) -> dict[str, str]:
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
    table_backed = feature_source in ("soccer_db_standings", "soccer_sportradar_api")
    from_sportradar_fetch = feature_source == "soccer_sportradar_api"

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

    if table_backed:
        src_line = (
            "Sportradar season standings (live API fetch, short cache)—`team_standings` was empty or incomplete."
            if from_sportradar_fetch
            else "Synced `team_standings` for this league; refresh via soccer schedule + standings sync."
        )
        form_standings = (
            f"• Table-backed season rates: {home} {_pct(h_wr)} vs {away} {_pct(a_wr)} (W/D/L-derived; goals/game in inputs).\n"
            f"• Recent-form index: {home} {_pct(h_form)} vs {away} {_pct(a_form)} "
            f"({'home edge' if form_gap > 0.02 else 'away edge' if form_gap < -0.02 else 'even'}) "
            f"— last few finished fixtures in DB when available, else season curve.\n"
            f"• Rest: {home} {rest_h}d vs {away} {rest_a}d ({'extra rest home' if rest_gap >= 2 else 'extra rest away' if rest_gap <= -2 else 'similar'}).\n"
            f"{src_line}"
        )
    else:
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


def _soccer_goals_per_game_plausible(h: float | None, a: float | None) -> bool:
    """Standings-derived gpg is ~0.3–3.5; synthetic non-soccer features use points-scale averages."""
    if h is None or a is None:
        return False
    hf, af = float(h), float(a)
    return 0.25 <= hf <= 4.5 and 0.25 <= af <= 4.5


def expected_scores_for_league(
    league: str,
    home_win_p: float,
    *,
    home_team_avg_score: float | None = None,
    away_team_avg_score: float | None = None,
) -> tuple[float, float]:
    base_h, base_a = _LEAGUE_SCORE_BASE.get(league, (2.0, 1.8))
    edge = (home_win_p - 0.5) * 2.0
    if league in ("nba", "nfl", "nhl"):
        shift = edge * 4.0
        return round(base_h + shift, 2), round(base_a - shift * 0.85, 2)
    if league == "mlb":
        shift = edge * 1.2
        return round(base_h + shift, 2), round(base_a - shift * 0.9, 2)
    if league in SOCCER_LEAGUES_SET:
        shift = edge * 0.45
        if _soccer_goals_per_game_plausible(home_team_avg_score, away_team_avg_score):
            hg = max(0.25, min(3.5, float(home_team_avg_score)))  # type: ignore[arg-type]
            ag = max(0.25, min(3.5, float(away_team_avg_score)))  # type: ignore[arg-type]
            lb_h, lb_a = _LEAGUE_SCORE_BASE.get(league, (1.65, 1.35))
            # Blend table goals/game with league priors; small home tilt (~typical xG home bump).
            lam_h = 0.72 * (hg * 1.07) + 0.28 * lb_h
            lam_a = 0.72 * (ag * 0.93) + 0.28 * lb_a
            return round(max(0.15, lam_h + shift), 2), round(max(0.15, lam_a - shift * 0.85), 2)
        return round(max(0.3, base_h + shift), 2), round(max(0.3, base_a - shift * 0.8), 2)
    shift = edge * 1.5
    return round(max(0.2, base_h + shift), 2), round(max(0.2, base_a - shift * 0.85), 2)
