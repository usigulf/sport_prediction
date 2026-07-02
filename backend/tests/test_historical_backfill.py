"""Tests for M-07 historical backfill helpers."""
from datetime import datetime, timezone
from uuid import uuid4

from app.models.game import Game
from app.services.historical_backfill_service import (
    SeasonSyncSummary,
    _prefer_sportradar_for_us_historical_season,
    count_decisive_finished_games,
    run_historical_backfill,
    soccer_season_labels,
    us_season_years,
)
from app.config import Settings
from app.services.clearsports_us_service import default_us_season_year


def test_soccer_season_labels_august():
    labels = soccer_season_labels(2, now=datetime(2026, 8, 1, tzinfo=timezone.utc))
    assert labels == ["2026-2027", "2025-2026", "2024-2025"]


def test_soccer_season_labels_january():
    labels = soccer_season_labels(1, now=datetime(2026, 1, 15, tzinfo=timezone.utc))
    assert labels == ["2025-2026", "2024-2025"]


def test_us_season_years_nfl():
    years = us_season_years("nfl", 2, now=datetime(2026, 10, 1, tzinfo=timezone.utc))
    assert years == ["2026", "2025", "2024"]


def test_prefer_sportradar_for_prior_us_season():
    settings = Settings(clearsports_api_key="cs", sportradar_api_key="sr")
    now = datetime(2026, 10, 1, tzinfo=timezone.utc)
    assert _prefer_sportradar_for_us_historical_season("nfl", "2025", settings, now=now) is True
    assert _prefer_sportradar_for_us_historical_season("nfl", "2026", settings, now=now) is False
    assert (
        _prefer_sportradar_for_us_historical_season(
            "nfl", str(default_us_season_year("nfl", now)), settings, now=now
        )
        is False
    )


def test_prefer_sportradar_requires_api_key():
    settings = Settings(clearsports_api_key="cs", sportradar_api_key="")
    assert _prefer_sportradar_for_us_historical_season("nfl", "2024", settings) is False


def test_count_decisive_finished_games(db, test_teams):
    home, away = test_teams
    g = Game(
        id=uuid4(),
        home_team_id=home.id,
        away_team_id=away.id,
        league="nfl",
        scheduled_time=datetime(2024, 9, 1, tzinfo=timezone.utc),
        status="finished",
        home_score=21,
        away_score=14,
    )
    db.add(g)
    draw = Game(
        id=uuid4(),
        home_team_id=home.id,
        away_team_id=away.id,
        league="nfl",
        scheduled_time=datetime(2024, 9, 8, tzinfo=timezone.utc),
        status="finished",
        home_score=10,
        away_score=10,
    )
    db.add(draw)
    db.commit()
    assert count_decisive_finished_games(db, "nfl") == 1
    assert count_decisive_finished_games(db) >= 1


def test_run_historical_backfill_mocked(db, monkeypatch):
    settings = Settings(clearsports_api_key="test-key", sportradar_api_key="")

    def fake_sync(db, league, season, settings):
        return SeasonSyncSummary(
            league=league,
            season=season,
            provider="clearsports",
            rows_fetched=10,
            games_upserted=8,
            rows_skipped=2,
        )

    monkeypatch.setattr(
        "app.services.historical_backfill_service._sync_us_season",
        fake_sync,
    )
    monkeypatch.setattr(
        "app.services.historical_backfill_service.configured_soccer_league_codes",
        lambda s: [],
    )

    result = run_historical_backfill(db, settings, seasons_back=1, leagues=["nfl"])
    assert len(result.season_syncs) == 2  # current + 1 prior season
    assert all(s.league == "nfl" for s in result.season_syncs)
    assert result.decisive_counts.get("nfl", 0) >= 0
