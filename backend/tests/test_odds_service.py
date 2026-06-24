"""Odds service unit tests (no live HTTP)."""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services import odds_service as odds
from app.services.cache_service import clear_fallback_memory_store


@pytest.fixture(autouse=True)
def _clear_odds_cache():
    clear_fallback_memory_store()
    yield
    clear_fallback_memory_store()


def test_american_odds_to_implied_prob():
    assert odds.american_odds_to_implied_prob(-150) == pytest.approx(0.6, abs=0.01)
    assert odds.american_odds_to_implied_prob(130) == pytest.approx(0.4348, abs=0.01)


def test_match_event_to_game_by_teams_and_kickoff():
    kickoff = datetime(2026, 6, 1, 18, 0, tzinfo=timezone.utc)
    game = SimpleNamespace(
        home_team=SimpleNamespace(name="Kansas City Chiefs"),
        away_team=SimpleNamespace(name="Buffalo Bills"),
        scheduled_time=kickoff,
    )
    events = [
        {
            "home_team": "Kansas City Chiefs",
            "away_team": "Buffalo Bills",
            "commence_time": "2026-06-01T18:30:00Z",
            "bookmakers": [],
        }
    ]
    assert odds.match_event_to_game(game, events) is events[0]


def test_consensus_from_event_median():
    game = SimpleNamespace(
        home_team=SimpleNamespace(name="Team A"),
        away_team=SimpleNamespace(name="Team B"),
    )
    event = {
        "bookmakers": [
            {
                "markets": [
                    {
                        "key": "h2h",
                        "outcomes": [
                            {"name": "Team A", "price": -120},
                            {"name": "Team B", "price": 100},
                        ],
                    },
                    {
                        "key": "spreads",
                        "outcomes": [{"name": "Team A", "point": -3.0, "price": -110}],
                    },
                    {
                        "key": "totals",
                        "outcomes": [{"name": "Over", "point": 45.5, "price": -105}],
                    },
                ]
            },
            {
                "markets": [
                    {
                        "key": "h2h",
                        "outcomes": [
                            {"name": "Team A", "price": -130},
                            {"name": "Team B", "price": 110},
                        ],
                    }
                ]
            },
        ]
    }
    c = odds._consensus_from_event(event, game)
    assert c["home_moneyline"] == -125
    assert c["spread_home"] == -3.0
    assert c["total_points"] == 45.5
    assert c["home_implied_prob"] is not None


def test_model_comparison_edge_labels():
    pred = SimpleNamespace(home_win_probability=0.62)
    consensus = {"home_implied_prob": 0.55}
    out = odds._model_comparison(consensus, pred)
    assert out["edge_label"] == "model_leans_home"
    assert out["home_edge_pct"] == pytest.approx(7.0)

    consensus2 = {"home_implied_prob": 0.61}
    out2 = odds._model_comparison(consensus2, pred)
    assert out2["edge_label"] == "aligned"


def test_clearsports_row_to_event_books():
    row = {
        "home_team_name": "Boston Celtics",
        "away_team_name": "Milwaukee Bucks",
        "time_utc": "2026-06-01T18:30:00Z",
        "books": [
            {
                "sportsbook_slug": "draftkings",
                "moneyline_home": -140,
                "moneyline_away": 120,
                "spread_home": -3.5,
                "total_points": 220.5,
            },
            {
                "sportsbook_slug": "fanduel",
                "moneyline_home": -145,
                "moneyline_away": 125,
            },
        ],
    }
    ev = odds._clearsports_row_to_event(row)
    assert ev["home_team"] == "Boston Celtics"
    assert len(ev["bookmakers"]) == 2
    game = SimpleNamespace(
        home_team=SimpleNamespace(name="Boston Celtics"),
        away_team=SimpleNamespace(name="Milwaukee Bucks"),
        scheduled_time=datetime(2026, 6, 1, 18, 0, tzinfo=timezone.utc),
    )
    c = odds._consensus_from_event(ev, game)
    assert c["home_moneyline"] == -142
    assert c["spread_home"] == -3.5


def test_odds_provider_prefers_odds_api_key():
    from app.config import Settings

    s = Settings(odds_api_key="odds", clearsports_api_key="cs")
    assert odds._odds_provider(s) == odds.PROVIDER_THE_ODDS_API
    s2 = Settings(odds_api_key="", clearsports_api_key="cs")
    assert odds._odds_provider(s2) == odds.PROVIDER_CLEARSPORTS


def test_get_market_odds_not_configured(db, test_game, monkeypatch):
    from app.config import Settings, get_settings

    empty = Settings(odds_api_key="", clearsports_api_key="")
    monkeypatch.setattr(odds, "get_settings", lambda: empty)
    get_settings.cache_clear()
    payload = odds.get_market_odds_for_game(db, test_game)
    assert payload["available"] is False
    assert payload["reason"] == "not_configured"


def test_get_market_odds_end_to_end(client, db, test_game, test_prediction, monkeypatch):
    monkeypatch.setenv("ODDS_API_KEY", "test-key")
    monkeypatch.delenv("CLEARSPORTS_API_KEY", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()

    sample = [
        {
            "home_team": test_game.home_team.name,
            "away_team": test_game.away_team.name,
            "commence_time": test_game.scheduled_time.astimezone(timezone.utc).isoformat(),
            "bookmakers": [
                {
                    "markets": [
                        {
                            "key": "h2h",
                            "outcomes": [
                                {"name": test_game.home_team.name, "price": -140},
                                {"name": test_game.away_team.name, "price": 120},
                            ],
                        }
                    ]
                }
            ],
        }
    ]

    monkeypatch.setattr(odds, "_fetch_sport_odds_json", lambda _s, _k: sample)

    r = client.get(f"/api/v1/games/{test_game.id}/market-odds")
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is True
    assert body["consensus"]["home_moneyline"] == -140
    assert body["model_comparison"]["edge_label"] in (
        "model_leans_home",
        "model_leans_away",
        "aligned",
    )

    get_settings.cache_clear()


def test_get_market_odds_clearsports_end_to_end(client, db, test_game, test_prediction, monkeypatch):
    monkeypatch.setenv("CLEARSPORTS_API_KEY", "test-cs-key")
    monkeypatch.delenv("ODDS_API_KEY", raising=False)
    from app.config import get_settings

    get_settings.cache_clear()

    sample_rows = [
        {
            "home_team_name": test_game.home_team.name,
            "away_team_name": test_game.away_team.name,
            "time_utc": test_game.scheduled_time.astimezone(timezone.utc).isoformat(),
            "books": [
                {
                    "sportsbook_slug": "draftkings",
                    "moneyline_home": -140,
                    "moneyline_away": 120,
                }
            ],
        }
    ]

    monkeypatch.setattr(odds, "_fetch_clearsports_game_odds_raw", lambda _s, _slug, _q: sample_rows)

    r = client.get(f"/api/v1/games/{test_game.id}/market-odds")
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is True
    assert body["provider"] == "clearsports"
    assert body["consensus"]["home_moneyline"] == -140

    get_settings.cache_clear()
