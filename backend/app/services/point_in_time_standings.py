"""
Point-in-time league table reconstruction from finished games stored in the DB.

For a matchup at kickoff T, aggregate each team's W/D/L and goals from league
fixtures with scheduled_time < T only — no future leakage from the current
`team_standings` snapshot.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game

# Require a few prior league fixtures before trusting PIT table rates.
PIT_MIN_TEAM_GAMES = 3


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


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


@dataclass
class _TeamAgg:
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0

    @property
    def played(self) -> int:
        return self.wins + self.draws + self.losses

    def points(self, soccer: bool) -> int:
        if soccer:
            return 3 * self.wins + self.draws
        return self.wins

    def win_rate(self, soccer: bool) -> float:
        p = self.played
        if p <= 0:
            return 0.5
        if soccer:
            return (self.wins + 0.5 * self.draws) / p
        return (self.wins + 0.5 * self.draws) / p


def _apply_result(agg: _TeamAgg, scored: int, conceded: int, soccer: bool) -> None:
    agg.goals_for += scored
    agg.goals_against += conceded
    if scored == conceded:
        agg.draws += 1
    elif scored > conceded:
        agg.wins += 1
    else:
        agg.losses += 1
    if not soccer and scored == conceded:
        # US ties are rare; draws field keeps win_rate at 0.5 contribution.
        pass


def _aggregate_from_games(games: list[Game], soccer: bool) -> dict[UUID, _TeamAgg]:
    stats: dict[UUID, _TeamAgg] = {}
    for g in games:
        hs, aws = g.home_score or 0, g.away_score or 0
        for team_id, scored, conceded in (
            (g.home_team_id, hs, aws),
            (g.away_team_id, aws, hs),
        ):
            if team_id is None:
                continue
            stats.setdefault(team_id, _TeamAgg())
            _apply_result(stats[team_id], scored, conceded, soccer)
    return stats


def _rank_team_ids(stats: dict[UUID, _TeamAgg], soccer: bool) -> dict[UUID, int]:
    if not stats:
        return {}

    def sort_key(item: tuple[UUID, _TeamAgg]) -> tuple:
        _tid, a = item
        gd = a.goals_for - a.goals_against
        if soccer:
            return (-a.points(True), -gd, -a.goals_for, str(_tid))
        wr = a.win_rate(False)
        return (-wr, -a.wins, -gd, str(_tid))

    ordered = sorted(stats.items(), key=sort_key)
    return {tid: idx + 1 for idx, (tid, _a) in enumerate(ordered)}


def league_table_from_finished(
    games: list[Game],
    *,
    soccer: bool,
) -> dict[UUID, SoccerTableRec]:
    """Build per-team table rows from an already-filtered list of finished fixtures."""
    stats = _aggregate_from_games(games, soccer)
    ranks = _rank_team_ids(stats, soccer)
    out: dict[UUID, SoccerTableRec] = {}
    for tid, a in stats.items():
        if a.played <= 0:
            continue
        out[tid] = SoccerTableRec(
            wins=a.wins,
            draws=a.draws,
            losses=a.losses,
            goals_for=a.goals_for,
            goals_against=a.goals_against,
            league_rank=ranks.get(tid, 99),
            points=a.points(soccer),
        )
    return out


def finished_league_games_before(
    db: Session,
    league: str,
    before: datetime,
) -> list[Game]:
    before = _as_utc(before)
    if before is None:
        return []
    return (
        db.query(Game)
        .filter(
            Game.league == league,
            Game.status.in_(["finished", "final"]),
            Game.scheduled_time.isnot(None),
            Game.scheduled_time < before,
            Game.home_score.isnot(None),
            Game.away_score.isnot(None),
        )
        .order_by(Game.scheduled_time.asc())
        .all()
    )


def pit_table_pair_for_game(db: Session, game: Game) -> tuple[SoccerTableRec, SoccerTableRec] | None:
    """Both sides' PIT records before kickoff, or None if insufficient history."""
    if not game.home_team_id or not game.away_team_id or not game.league:
        return None
    kickoff = _as_utc(game.scheduled_time)
    if kickoff is None:
        return None
    league = (game.league or "").lower()
    soccer = league in SOCCER_LEAGUES_SET
    games = finished_league_games_before(db, league, kickoff)
    table = league_table_from_finished(games, soccer=soccer)
    rh = table.get(game.home_team_id)
    ra = table.get(game.away_team_id)
    if rh is None or ra is None:
        return None
    if rh.played < PIT_MIN_TEAM_GAMES or ra.played < PIT_MIN_TEAM_GAMES:
        return None
    return rh, ra


class PitStandingsCache:
    """
    Preloads finished fixtures per league once for batch training.
    games_before() slices the sorted list instead of re-querying the DB per row.
    """

    def __init__(self, db: Session) -> None:
        self._db = db
        self._by_league: dict[str, list[Game]] = {}

    def preload_leagues(self, leagues: set[str]) -> None:
        for league in leagues:
            if league in self._by_league:
                continue
            rows = (
                self._db.query(Game)
                .filter(
                    Game.league == league,
                    Game.status.in_(["finished", "final"]),
                    Game.scheduled_time.isnot(None),
                    Game.home_score.isnot(None),
                    Game.away_score.isnot(None),
                )
                .order_by(Game.scheduled_time.asc())
                .all()
            )
            self._by_league[league] = rows

    def games_before(self, league: str, before: datetime) -> list[Game]:
        before = _as_utc(before)
        if before is None:
            return []
        rows = self._by_league.get(league)
        if rows is None:
            return finished_league_games_before(self._db, league, before)
        out: list[Game] = []
        for g in rows:
            gt = _as_utc(g.scheduled_time)
            if gt is not None and gt < before:
                out.append(g)
            elif gt is not None and gt >= before:
                break
        return out

    def pit_pair_for_game(self, game: Game) -> tuple[SoccerTableRec, SoccerTableRec] | None:
        if not game.home_team_id or not game.away_team_id or not game.league:
            return None
        kickoff = _as_utc(game.scheduled_time)
        if kickoff is None:
            return None
        league = (game.league or "").lower()
        soccer = league in SOCCER_LEAGUES_SET
        games = self.games_before(league, kickoff)
        table = league_table_from_finished(games, soccer=soccer)
        rh = table.get(game.home_team_id)
        ra = table.get(game.away_team_id)
        if rh is None or ra is None:
            return None
        if rh.played < PIT_MIN_TEAM_GAMES or ra.played < PIT_MIN_TEAM_GAMES:
            return None
        return rh, ra

    @classmethod
    def from_games(cls, db: Session, games: list[Game]) -> PitStandingsCache:
        leagues = {(g.league or "").lower() for g in games if g.league}
        cache = cls(db)
        cache.preload_leagues({lg for lg in leagues if lg})
        return cache
