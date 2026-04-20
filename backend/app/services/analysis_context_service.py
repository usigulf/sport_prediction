"""
DB-backed context for full analysis: H2H from past games, standings rows,
key model inputs (advanced metrics proxy), and scenario narratives.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc, or_

from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game
from app.models.game_player_spotlight import GamePlayerSpotlight
from app.models.prediction import Prediction
from app.models.team_standing import TeamStanding
from app.schemas.prediction import (
    H2HMeetingDetail,
    MetricComparisonRow,
    ProbabilityTrendPoint,
    PlayerSpotlightDetail,
    RichAnalysisSections,
    StandingsRowDetail,
    StructuredGameAnalysis,
)
from app.config import get_settings
from app.services.feature_builder import (
    FeatureSource,
    build_game_features,
    format_recent_wdl_for_matchup,
)
from app.services.sportradar_soccer_service import soccer_season_id_for_league


def implied_draw_probability(home_p: float, away_p: float) -> float:
    s = home_p + away_p
    if s >= 0.999:
        return 0.0
    return max(0.0, 1.0 - s)


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def _h2h_past_games(db: Session, game: Game, limit: int = 10) -> list[Game]:
    """Finished prior meetings between the two sides in this league (newest first)."""
    if not game.home_team or not game.away_team:
        return []
    h_id, a_id = game.home_team_id, game.away_team_id
    league = game.league
    return (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(
            Game.league == league,
            Game.status == "finished",
            Game.id != game.id,
            or_(
                and_(Game.home_team_id == h_id, Game.away_team_id == a_id),
                and_(Game.home_team_id == a_id, Game.away_team_id == h_id),
            ),
        )
        .order_by(desc(Game.scheduled_time))
        .limit(limit)
        .all()
    )


def build_h2h_history_text(db: Session, game: Game) -> str | None:
    """Last up to 10 finished meetings between these teams in this league."""
    past = _h2h_past_games(db, game, 10)
    if not game.home_team or not game.away_team:
        return None
    h_id = game.home_team_id
    hn, an = game.home_team.name, game.away_team.name
    if not past:
        return (
            f"No prior head-to-head meetings between {hn} and {an} are stored yet. "
            "Past results will appear here once historical fixtures are synced."
        )

    wins_h = 0
    wins_a = 0
    draws = 0

    lines: list[str] = [
        f"Last {len(past)} meeting(s) in our database (most recent first):",
        "",
    ]
    gh_for, ga_for = 0, 0
    for g in past:
        hs = g.home_score or 0
        aws = g.away_score or 0
        gh = g.home_team.name if g.home_team else "Home"
        ga = g.away_team.name if g.away_team else "Away"
        dt = g.scheduled_time.strftime("%Y-%m-%d") if g.scheduled_time else "?"
        lines.append(f"• {dt} — {gh} {hs}–{aws} {ga}")

        if g.home_team_id == h_id:
            gh_for += hs
            ga_for += aws
        else:
            gh_for += aws
            ga_for += hs

        if hs == aws:
            draws += 1
        else:
            win_id = g.home_team_id if hs > aws else g.away_team_id
            if win_id == h_id:
                wins_h += 1
            else:
                wins_a += 1

    n = len(past)
    lines.append("")
    lines.append(
        f"Summary (current matchup: {hn} vs {an}): {hn} {wins_h}W — {draws}D — {wins_a}W {an} "
        "in this sample."
    )
    if n:
        lines.append(
            f"Goal totals over the sample: {hn} {gh_for} – {ga_for} {an} "
            f"(~{gh_for / n:.1f} vs ~{ga_for / n:.1f} per game)."
        )
    return "\n".join(lines)


def build_standings_text(db: Session, game: Game) -> str | None:
    if not game.home_team or not game.away_team:
        return None
    league = game.league
    ids = [game.home_team_id, game.away_team_id]
    rows = (
        db.query(TeamStanding)
        .filter(TeamStanding.league == league, TeamStanding.team_id.in_(ids))
        .all()
    )
    by_team = {r.team_id: r for r in rows}
    hn, an = game.home_team.name, game.away_team.name
    if len(by_team) < 2:
        return (
            "League table positions are not synced for this matchup yet. "
            "Connect a standings feed (or seed team_standings) to show rank, points, and goal difference."
        )

    def line(name: str, r: TeamStanding) -> str:
        gf, ga = r.goals_for, r.goals_against
        gd = (gf or 0) - (ga or 0)
        pts = r.points if r.points is not None else 3 * r.wins + r.draws
        return (
            f"• {name}: rank #{r.league_rank} — {r.played} played, {r.wins}-{r.draws}-{r.losses}, "
            f"{pts} pts, {gf or 0}–{ga or 0} ({gd:+d} GD)"
        )

    rh, ra = by_team[game.home_team_id], by_team[game.away_team_id]
    return "Current form & standings (league snapshot in database):\n\n" + "\n".join(
        [line(hn, rh), line(an, ra)]
    )


def build_advanced_metrics_text(game: Game, features: dict[str, float | int]) -> str:
    """Structured key inputs; replace with sport-specific stats when feeds exist."""
    home = game.home_team.name if getattr(game, "home_team", None) else "Home"
    away = game.away_team.name if getattr(game, "away_team", None) else "Away"
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

    return (
        "Advanced statistics & key metrics (model inputs — swap for league APIs when connected):\n\n"
        f"• Pace / scoring environment: {home} avg {h_pts:.1f} vs {away} {a_pts:.1f} in offensive inputs.\n"
        f"• Season strength (win-rate priors): {home} {_pct(h_wr)} vs {away} {_pct(a_wr)}.\n"
        f"• Momentum (recent-form index): {home} {_pct(h_form)} vs {away} {_pct(a_form)} "
        f"({'home momentum' if form_gap > 0.02 else 'away momentum' if form_gap < -0.02 else 'neutral'}).\n"
        f"• Rest: {home} {rest_h}d vs {away} {rest_a}d.\n"
        f"• Home-field / venue bump (logit scale): +{adv:.3f} for {home}."
    )


def build_scenario_outcomes_text(prediction: Prediction, game: Game) -> str:
    h = float(prediction.home_win_probability)
    a = float(prediction.away_win_probability)
    d = implied_draw_probability(h, a)
    hm = game.home_team.name if game.home_team else "Home"
    aw = game.away_team.name if game.away_team else "Away"
    eh = float(prediction.expected_home_score) if prediction.expected_home_score is not None else None
    ea = float(prediction.expected_away_score) if prediction.expected_away_score is not None else None
    score_note = (
        f" The projected score environment is near {eh:.1f}–{ea:.1f} when expected totals are available."
        if eh is not None and ea is not None
        else ""
    )

    blocks: list[str] = [
        "Possible outcomes & scenario explanations (same probabilities as the card, with context):",
        "",
    ]
    if d >= 0.005:
        blocks.append(
            f"• {hm} win ({_pct(h)}): Most likely if the game follows the season and recent-form signals; "
            f"early control and finishing quality reinforce this path.{score_note}"
        )
        blocks.append(
            f"• Draw ({_pct(d)}): Live if chances stay even, defenses hold, or finishing regresses—"
            "typical of tight tactical battles or low-tempo scripts."
        )
        blocks.append(
            f"• {aw} win ({_pct(a)}): Needs a spike in efficiency, disruption of {hm}'s rhythm, "
            "or underperformance from the favorite—still plausible in one-off variance."
        )
    else:
        blocks.append(
            f"• {hm} win ({_pct(h)}): Primary lane—{aw} must flip underlying inputs (form, rest, matchup) to overturn."
        )
        blocks.append(
            f"• {aw} win ({_pct(a)}): Underdog path—usually requires mistakes, matchup edges, or a hot stretch."
        )
    blocks.append("")
    blocks.append(
        "These are probabilistic scenarios, not guarantees; use bankroll and risk rules you are comfortable with."
    )
    return "\n".join(blocks)


def build_standings_row_details(db: Session, game: Game) -> list[StandingsRowDetail]:
    if not game.home_team or not game.away_team:
        return []
    league = game.league
    ids = [game.home_team_id, game.away_team_id]
    rows = (
        db.query(TeamStanding)
        .filter(TeamStanding.league == league, TeamStanding.team_id.in_(ids))
        .all()
    )
    by_team = {r.team_id: r for r in rows}
    out: list[StandingsRowDetail] = []
    for tid, name in [
        (game.home_team_id, game.home_team.name),
        (game.away_team_id, game.away_team.name),
    ]:
        r = by_team.get(tid)
        if not r:
            continue
        gf, ga = r.goals_for or 0, r.goals_against or 0
        pts = r.points if r.points is not None else 3 * r.wins + r.draws
        out.append(
            StandingsRowDetail(
                team_name=name,
                league_rank=r.league_rank,
                played=r.played,
                wins=r.wins,
                draws=r.draws,
                losses=r.losses,
                points=pts,
                goals_for=r.goals_for,
                goals_against=r.goals_against,
                goal_difference=gf - ga,
            )
        )
    return out


def build_h2h_structured(db: Session, game: Game) -> tuple[list[H2HMeetingDetail], str | None]:
    past = _h2h_past_games(db, game, 10)
    if not game.home_team or not game.away_team:
        return [], None
    hn, an = game.home_team.name, game.away_team.name
    h_id = game.home_team_id
    if not past:
        return [], (
            f"No prior head-to-head meetings between {hn} and {an} are stored yet. "
            "Past results will appear once historical fixtures are synced."
        )

    meetings: list[H2HMeetingDetail] = []
    wins_h = wins_a = draws = 0
    gh_for = ga_for = 0
    for g in past:
        hs = g.home_score or 0
        aws = g.away_score or 0
        meetings.append(
            H2HMeetingDetail(
                date_iso=g.scheduled_time.strftime("%Y-%m-%d") if g.scheduled_time else "?",
                home_team_name=g.home_team.name if g.home_team else "Home",
                away_team_name=g.away_team.name if g.away_team else "Away",
                home_score=hs,
                away_score=aws,
            )
        )
        if g.home_team_id == h_id:
            gh_for += hs
            ga_for += aws
        else:
            gh_for += aws
            ga_for += hs
        if hs == aws:
            draws += 1
        else:
            win_id = g.home_team_id if hs > aws else g.away_team_id
            if win_id == h_id:
                wins_h += 1
            else:
                wins_a += 1

    n = len(past)
    summary = (
        f"{hn} {wins_h}W – {draws}D – {wins_a}W {an} over last {n} in DB. "
        f"Goals: {hn} {gh_for} – {ga_for} {an} (~{gh_for / n:.1f} vs ~{ga_for / n:.1f} per game)."
    )
    return meetings, summary


def build_metric_comparison_rows(
    game: Game,
    features: dict[str, float | int],
    feature_source: FeatureSource = "synthetic",
) -> list[MetricComparisonRow]:
    home = game.home_team.name if game.home_team else "Home"
    away = game.away_team.name if game.away_team else "Away"
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
    momentum = (
        f"Lean {home}" if form_gap > 0.02 else f"Lean {away}" if form_gap < -0.02 else "Neutral"
    )
    soccer_table = feature_source in ("soccer_db_standings", "soccer_sportradar_api")
    if soccer_table:
        season_label = "Season strength (table)"
        season_fn = "(Wins + ½ draws) ÷ matches played — from league standings."
        recent_label = "Form index (last 5 league games)"
        recent_fn = (
            f"{momentum} Index = points per game (win = 1, draw = ½) over recent league matches in our DB."
        )
        off_label = "Goals per match (table)"
        off_fn = "Goals scored ÷ matches played in the standings snapshot."
        rest_fn = "Days since each side's previous league match in our DB (capped 1–14)."
        adv_fn = "Home edge scaled slightly by table rank gap."
    else:
        season_label = "Season win-rate prior (demo)"
        season_fn = "Synthetic prior until real standings and results are connected for this league."
        recent_label = "Recent-form index (demo)"
        recent_fn = f"{momentum} Synthetic roll-up (not tied to a fixed last-N window)."
        off_label = "Offensive input (demo)"
        off_fn = "Synthetic scoring prior — becomes table goals/match when soccer standings sync."
        rest_fn = "Synthetic rest spacing for demo."
        adv_fn = "Synthetic home-field tilt."
    return [
        MetricComparisonRow(
            label=season_label,
            home_display=_pct(h_wr),
            away_display=_pct(a_wr),
            footnote=season_fn,
        ),
        MetricComparisonRow(
            label=recent_label,
            home_display=_pct(h_form),
            away_display=_pct(a_form),
            footnote=recent_fn,
        ),
        MetricComparisonRow(
            label=off_label,
            home_display=f"{h_pts:.1f}",
            away_display=f"{a_pts:.1f}",
            footnote=off_fn,
        ),
        MetricComparisonRow(
            label="Rest days",
            home_display=str(rest_h),
            away_display=str(rest_a),
            footnote=rest_fn,
        ),
        MetricComparisonRow(
            label="Home venue bump (model)",
            home_display=f"+{adv:.3f} logit",
            away_display="—",
            footnote=adv_fn,
        ),
    ]


def load_player_spotlights(db: Session, game_id) -> list[PlayerSpotlightDetail]:
    rows = (
        db.query(GamePlayerSpotlight)
        .filter(GamePlayerSpotlight.game_id == game_id)
        .order_by(GamePlayerSpotlight.sort_order.asc(), GamePlayerSpotlight.player_name.asc())
        .all()
    )
    return [
        PlayerSpotlightDetail(
            player_name=r.player_name,
            team_name=r.team_name,
            role=r.role,
            summary=r.summary,
        )
        for r in rows
    ]


def build_probability_trend(db: Session, game: Game, limit: int = 6) -> list[ProbabilityTrendPoint]:
    preds = (
        db.query(Prediction)
        .filter(Prediction.game_id == game.id)
        .order_by(desc(Prediction.created_at))
        .limit(limit)
        .all()
    )
    if not preds:
        return []
    points: list[ProbabilityTrendPoint] = []
    for p in reversed(preds):
        hp = float(p.home_win_probability)
        ap = float(p.away_win_probability)
        dp = implied_draw_probability(hp, ap) if (game.league or "").lower() in SOCCER_LEAGUES_SET else None
        points.append(
            ProbabilityTrendPoint(
                timestamp_iso=p.created_at.isoformat() if p.created_at else "",
                home_win_probability=hp,
                away_win_probability=ap,
                draw_probability=dp,
                confidence_level=p.confidence_level,
            )
        )
    return [pt for pt in points if pt.timestamp_iso]


def build_structured_game_analysis(db: Session, game: Game | None) -> StructuredGameAnalysis:
    """Rows for tables/cards; complements narrative rich_analysis."""
    note = (
        f"Snapshot at {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC — "
        "pull to refresh after live prediction updates."
    )
    if not game or not game.home_team or not game.away_team:
        return StructuredGameAnalysis(data_freshness_note=note)
    feats, src = build_game_features(game, db)
    league_label = (game.league or "").upper() or None
    h2h_meetings, h2h_series_summary = build_h2h_structured(db, game)
    out = StructuredGameAnalysis(
        league_label=league_label,
        standings_rows=build_standings_row_details(db, game),
        h2h_meetings=h2h_meetings,
        h2h_series_summary=h2h_series_summary,
        metric_comparisons=build_metric_comparison_rows(game, feats, src),
        probability_trend=build_probability_trend(db, game),
        recent_form_snapshot=format_recent_wdl_for_matchup(db, game),
        player_spotlights=load_player_spotlights(db, game.id),
        data_freshness_note=note,
    )
    league_l = (game.league or "").lower()
    if league_l == "nfl":
        from app.config import get_settings
        from app.services.sportradar_nfl_service import nfl_matchup_provider_note

        pn = nfl_matchup_provider_note(game, get_settings())
        if pn:
            out = out.model_copy(update={"provider_context_note": pn})
    elif soccer_season_id_for_league(league_l, get_settings()):
        from app.services.sportradar_soccer_service import soccer_matchup_provider_note

        pn = soccer_matchup_provider_note(game, get_settings())
        if pn:
            out = out.model_copy(update={"provider_context_note": pn})
    return out


def enrich_rich_analysis(
    db: Session,
    game: Game | None,
    prediction: Prediction,
    base: RichAnalysisSections | None,
) -> RichAnalysisSections | None:
    """Merge job narrative with DB context (H2H, standings) and generated metrics/scenarios."""
    extra: dict[str, str | None] = {}
    if game and game.home_team and game.away_team:
        feats, _ = build_game_features(game, db)
        extra["h2h_history"] = build_h2h_history_text(db, game)
        extra["standings_context"] = build_standings_text(db, game)
        extra["advanced_metrics"] = build_advanced_metrics_text(game, feats)
        extra["scenario_outcomes"] = build_scenario_outcomes_text(prediction, game)
    extra = {k: v for k, v in extra.items() if v}

    if base is None:
        if not extra:
            return None
        return RichAnalysisSections(**extra)
    if not extra:
        return base
    return base.model_copy(update=extra)
