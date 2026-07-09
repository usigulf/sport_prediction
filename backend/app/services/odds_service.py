"""
Market odds (M-01 spike): read-only consensus lines.

Uses ClearSports `/api/v1/{league}/game-odds` when CLEARSPORTS_API_KEY is set
(reuses the same key as schedule sync). Optional ODDS_API_KEY selects The Odds API instead.
Display-only — not wagering, not line shopping.
"""
from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from statistics import median
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.config import Settings, get_settings
from app.models.game import Game
from app.models.prediction import Prediction
from app.services.cache_service import CacheService
from app.services.clearsports_client import clearsports_get_json
from app.services.clearsports_soccer_service import CLEARSPORTS_LEAGUE_SLUG
from app.services.prediction_service import PredictionService

logger = logging.getLogger(__name__)

PROVIDER_THE_ODDS_API = "the_odds_api"
PROVIDER_CLEARSPORTS = "clearsports"

# Internal league code → The Odds API sport key (https://the-odds-api.com/sports-odds-data/sports-apis.html)
LEAGUE_TO_ODDS_SPORT: dict[str, str] = {
    "nfl": "americanfootball_nfl",
    "nba": "basketball_nba",
    "mls": "soccer_usa_mls",
    "premier_league": "soccer_epl",
    "bundesliga": "soccer_germany_bundesliga",
    "la_liga": "soccer_spain_la_liga",
    "serie_a": "soccer_italy_serie_a",
    "champions_league": "soccer_uefa_champs_league",
}

# Internal league code → ClearSports URL segment (game-odds feed)
LEAGUE_TO_CLEARSPORTS_SLUG: dict[str, str] = {
    "nfl": "nfl",
    "nba": "nba",
    **CLEARSPORTS_LEAGUE_SLUG,
}

DISCLAIMER = (
    "Informational consensus from licensed sportsbooks — not betting advice, "
    "not an offer to wager, and not a sportsbook."
)

_EDGE_ALIGNED_PCT = 3.0


def _odds_provider(settings: Settings) -> str:
    """Prefer explicit ODDS_API_KEY; otherwise reuse CLEARSPORTS_API_KEY."""
    if (settings.odds_api_key or "").strip():
        return PROVIDER_THE_ODDS_API
    if (settings.clearsports_api_key or "").strip():
        return PROVIDER_CLEARSPORTS
    return ""


def _odds_configured(settings: Settings) -> bool:
    return bool(_odds_provider(settings))


def american_odds_to_implied_prob(american: int) -> float:
    o = int(american)
    if o == 0:
        return 0.5
    if o < 0:
        x = abs(o)
        return x / (x + 100.0)
    return 100.0 / (o + 100.0)


def _norm_team_name(name: str) -> str:
    s = (name or "").lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return " ".join(s.split())


_GENERIC_TEAM_TOKENS = frozenset(
    {"fc", "city", "team", "the", "united", "club", "sc", "cf", "de", "real"}
)


def _names_match(a: str, b: str) -> bool:
    na, nb = _norm_team_name(a), _norm_team_name(b)
    if not na or not nb:
        return False
    if na == nb or na in nb or nb in na:
        return True
    ta, tb = set(na.split()), set(nb.split())
    shared = ta & tb
    if len(shared) >= 2:
        return True
    distinctive = shared - _GENERIC_TEAM_TOKENS
    return len(distinctive) >= 1


def _parse_commence(iso: str | None) -> datetime | None:
    if not iso:
        return None
    try:
        raw = iso.replace("Z", "+00:00")
        dt = datetime.fromisoformat(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _kickoff_utc(game: Game) -> datetime | None:
    kick = game.scheduled_time
    if not kick:
        return None
    if kick.tzinfo is None:
        return kick.replace(tzinfo=timezone.utc)
    return kick


def match_event_to_game(game: Game, events: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Match provider event to our game by team names + kickoff window."""
    home_name = game.home_team.name if game.home_team else ""
    away_name = game.away_team.name if game.away_team else ""
    kickoff = _kickoff_utc(game)
    best: dict[str, Any] | None = None
    best_delta = 999999.0
    for ev in events:
        eh = str(ev.get("home_team") or "")
        ea = str(ev.get("away_team") or "")
        if not (_names_match(eh, home_name) and _names_match(ea, away_name)):
            continue
        if kickoff:
            commence = _parse_commence(ev.get("commence_time"))
            if commence:
                delta_h = abs((commence - kickoff).total_seconds()) / 3600.0
                if delta_h > 36:
                    continue
                if delta_h < best_delta:
                    best_delta = delta_h
                    best = ev
                continue
        return ev
    return best


def _fetch_sport_odds_json(settings: Settings, sport_key: str) -> list[dict[str, Any]] | None:
    key = (settings.odds_api_key or "").strip()
    if not key:
        return None
    base = (settings.odds_api_base_url or "https://api.the-odds-api.com/v4").rstrip("/")
    params = urllib.parse.urlencode(
        {
            "apiKey": key,
            "regions": settings.odds_api_regions,
            "markets": settings.odds_api_markets,
            "oddsFormat": "american",
        }
    )
    url = f"{base}/sports/{sport_key}/odds?{params}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=settings.odds_api_timeout_seconds) as resp:
            if resp.getcode() != 200:
                return None
            body = json.loads(resp.read().decode("utf-8", errors="replace"))
            return body if isinstance(body, list) else None
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError) as exc:
        logger.warning("Odds API fetch failed sport=%s: %s", sport_key, exc)
        return None


def _cached_sport_events(settings: Settings, sport_key: str) -> list[dict[str, Any]]:
    cache = CacheService()
    cache_key = f"odds:v1:{sport_key}"
    cached = cache.get(cache_key)
    if isinstance(cached, list):
        return cached
    events = _fetch_sport_odds_json(settings, sport_key) or []
    cache.set(cache_key, events, ttl=int(settings.odds_cache_ttl_seconds))
    return events


def _clearsports_query_for_game(settings: Settings, league: str, game: Game) -> dict[str, str]:
    query: dict[str, str] = {}
    if league in ("nfl", "nba"):
        from app.services.clearsports_us_service import clearsports_us_season_for_league

        query["season"] = clearsports_us_season_for_league(league, settings)  # type: ignore[arg-type]
    elif league in LEAGUE_TO_CLEARSPORTS_SLUG:
        from app.services.clearsports_soccer_service import clearsports_season_for_league

        season = clearsports_season_for_league(league, settings)
        if season:
            query["season"] = season
    kickoff = _kickoff_utc(game)
    if kickoff:
        query["date"] = kickoff.strftime("%Y-%m-%d")
    return query


def _cs_team_names_from_row(row: dict[str, Any]) -> tuple[str, str]:
    home = row.get("home_team_name") or row.get("home_team")
    away = row.get("away_team_name") or row.get("away_team")
    if isinstance(home, dict):
        home = home.get("name") or home.get("abbreviation")
    if isinstance(away, dict):
        away = away.get("name") or away.get("abbreviation")
    home_abbr = str(row.get("home_team_abbreviation") or row.get("home_abbr") or "")
    away_abbr = str(row.get("away_team_abbreviation") or row.get("away_abbr") or "")
    return str(home or home_abbr), str(away or away_abbr)


def _cs_book_to_bookmaker(book: dict[str, Any], home_name: str, away_name: str) -> dict[str, Any]:
    markets: list[dict[str, Any]] = []
    home_ml = book.get("moneyline_home") or book.get("home_moneyline") or book.get("home_ml")
    away_ml = book.get("moneyline_away") or book.get("away_moneyline") or book.get("away_ml")
    if home_ml is not None and away_ml is not None:
        markets.append(
            {
                "key": "h2h",
                "outcomes": [
                    {"name": home_name, "price": int(home_ml)},
                    {"name": away_name, "price": int(away_ml)},
                ],
            }
        )
    spread = book.get("spread_home") if book.get("spread_home") is not None else book.get("home_spread")
    spread_price = book.get("spread_home_price") or book.get("spread_home_odds") or book.get("spread_price")
    if spread is not None:
        markets.append(
            {
                "key": "spreads",
                "outcomes": [
                    {
                        "name": home_name,
                        "point": float(spread),
                        "price": int(spread_price) if spread_price is not None else -110,
                    }
                ],
            }
        )
    total = (
        book.get("total_points")
        if book.get("total_points") is not None
        else book.get("total") or book.get("over_under")
    )
    over_price = book.get("over_price") or book.get("over_odds")
    if total is not None:
        markets.append(
            {
                "key": "totals",
                "outcomes": [
                    {
                        "name": "Over",
                        "point": float(total),
                        "price": int(over_price) if over_price is not None else -110,
                    }
                ],
            }
        )
    return {
        "key": str(book.get("sportsbook_slug") or book.get("book") or book.get("source_id") or "book"),
        "markets": markets,
    }


def _clearsports_row_to_event(row: dict[str, Any]) -> dict[str, Any]:
    home_name, away_name = _cs_team_names_from_row(row)
    commence = row.get("time_utc") or row.get("scheduled_at") or row.get("commence_time")
    bookmakers: list[dict[str, Any]] = []
    if isinstance(row.get("bookmakers"), list):
        bookmakers = [b for b in row["bookmakers"] if isinstance(b, dict)]
    else:
        for key in ("books", "sportsbooks", "odds", "lines"):
            items = row.get(key)
            if not isinstance(items, list):
                continue
            for book in items:
                if not isinstance(book, dict):
                    continue
                bm = _cs_book_to_bookmaker(book, home_name, away_name)
                if bm["markets"]:
                    bookmakers.append(bm)
            if bookmakers:
                break
        if not bookmakers:
            bm = _cs_book_to_bookmaker(row, home_name, away_name)
            if bm["markets"]:
                bookmakers.append(bm)
    return {
        "home_team": home_name,
        "away_team": away_name,
        "commence_time": commence,
        "bookmakers": bookmakers,
    }


def _fetch_clearsports_game_odds_raw(
    settings: Settings,
    slug: str,
    query: dict[str, str],
) -> list[dict[str, Any]]:
    key = (settings.clearsports_api_key or "").strip()
    if not key:
        return []
    base = (settings.clearsports_api_base_url or "https://api.clearsportsapi.com").strip()
    data, _code, err = clearsports_get_json(
        base,
        key,
        f"/v1/{slug}/game-odds",
        query or None,
        timeout=int(settings.odds_api_timeout_seconds),
    )
    if not isinstance(data, dict):
        if err:
            logger.warning("ClearSports game-odds fetch failed slug=%s: %s", slug, err[:200])
        return []
    items = data.get("game_odds") or data.get("data") or []
    if not isinstance(items, list):
        return []
    return [row for row in items if isinstance(row, dict)]


def _cached_clearsports_events(
    settings: Settings,
    league: str,
    slug: str,
    game: Game,
) -> list[dict[str, Any]]:
    query = _clearsports_query_for_game(settings, league, game)
    cache = CacheService()
    cache_key = f"odds:cs:v1:{slug}:{query.get('season', '')}:{query.get('date', '')}"
    cached = cache.get(cache_key)
    if isinstance(cached, list):
        return cached
    rows = _fetch_clearsports_game_odds_raw(settings, slug, query)
    events = [_clearsports_row_to_event(row) for row in rows]
    cache.set(cache_key, events, ttl=int(settings.odds_cache_ttl_seconds))
    return events


def _consensus_from_event(event: dict[str, Any], game: Game) -> dict[str, Any]:
    home_name = game.home_team.name if game.home_team else ""
    away_name = game.away_team.name if game.away_team else ""
    home_mls: list[int] = []
    away_mls: list[int] = []
    spreads: list[float] = []
    spread_prices: list[int] = []
    totals: list[float] = []
    over_prices: list[int] = []

    for book in event.get("bookmakers") or []:
        for market in book.get("markets") or []:
            mkey = (market.get("key") or "").lower()
            outcomes = market.get("outcomes") or []
            if mkey == "h2h":
                for o in outcomes:
                    name = str(o.get("name") or "")
                    price = o.get("price")
                    if price is None:
                        continue
                    if _names_match(name, home_name):
                        home_mls.append(int(price))
                    elif _names_match(name, away_name):
                        away_mls.append(int(price))
            elif mkey == "spreads":
                for o in outcomes:
                    if not _names_match(str(o.get("name") or ""), home_name):
                        continue
                    pt = o.get("point")
                    price = o.get("price")
                    if pt is not None:
                        spreads.append(float(pt))
                    if price is not None:
                        spread_prices.append(int(price))
            elif mkey == "totals":
                for o in outcomes:
                    if str(o.get("name") or "").lower() != "over":
                        continue
                    pt = o.get("point")
                    price = o.get("price")
                    if pt is not None:
                        totals.append(float(pt))
                    if price is not None:
                        over_prices.append(int(price))

    home_ml = int(round(median(home_mls))) if home_mls else None
    away_ml = int(round(median(away_mls))) if away_mls else None
    home_imp = american_odds_to_implied_prob(home_ml) if home_ml is not None else None
    away_imp = american_odds_to_implied_prob(away_ml) if away_ml is not None else None
    if home_imp is not None and away_imp is not None and home_imp + away_imp > 0:
        s = home_imp + away_imp
        home_imp = round(home_imp / s, 4)
        away_imp = round(away_imp / s, 4)

    return {
        "home_moneyline": home_ml,
        "away_moneyline": away_ml,
        "home_implied_prob": home_imp,
        "away_implied_prob": away_imp,
        "spread_home": round(float(median(spreads)), 1) if spreads else None,
        "spread_home_price": int(round(median(spread_prices))) if spread_prices else None,
        "total_points": round(float(median(totals)), 1) if totals else None,
        "over_price": int(round(median(over_prices))) if over_prices else None,
        "book_count": len(event.get("bookmakers") or []),
    }


def _model_comparison(
    consensus: dict[str, Any],
    prediction: Prediction | None,
) -> dict[str, Any]:
    market_home = consensus.get("home_implied_prob")
    if prediction is None or market_home is None:
        return {
            "model_home_win_prob": float(prediction.home_win_probability) if prediction else None,
            "market_home_implied_prob": market_home,
            "home_edge_pct": None,
            "edge_label": "unavailable",
        }
    model_home = float(prediction.home_win_probability)
    edge_pct = round((model_home - float(market_home)) * 100.0, 1)
    if abs(edge_pct) < _EDGE_ALIGNED_PCT:
        label = "aligned"
    elif edge_pct > 0:
        label = "model_leans_home"
    else:
        label = "model_leans_away"
    return {
        "model_home_win_prob": round(model_home, 4),
        "market_home_implied_prob": market_home,
        "home_edge_pct": edge_pct,
        "edge_label": label,
    }


def get_market_odds_for_game(db: Session, game: Game) -> dict[str, Any]:
    settings = get_settings()
    provider = _odds_provider(settings)
    if not provider:
        return {"available": False, "reason": "not_configured", "book_count": 0}

    league = (game.league or "").lower()
    if provider == PROVIDER_THE_ODDS_API:
        sport_key = LEAGUE_TO_ODDS_SPORT.get(league)
        if not sport_key:
            return {"available": False, "reason": "league_not_supported", "book_count": 0}
        events = _cached_sport_events(settings, sport_key)
    else:
        sport_key = LEAGUE_TO_CLEARSPORTS_SLUG.get(league)
        if not sport_key:
            return {"available": False, "reason": "league_not_supported", "book_count": 0}
        events = _cached_clearsports_events(settings, league, sport_key, game)

    if not events:
        return {
            "available": False,
            "reason": "no_events",
            "provider": provider,
            "sport_key": sport_key,
            "book_count": 0,
        }

    matched = match_event_to_game(game, events)
    if not matched:
        return {
            "available": False,
            "reason": "game_not_matched",
            "provider": provider,
            "sport_key": sport_key,
            "book_count": 0,
        }

    consensus = _consensus_from_event(matched, game)
    if consensus.get("home_implied_prob") is None and consensus.get("spread_home") is None:
        return {
            "available": False,
            "reason": "no_markets",
            "provider": provider,
            "sport_key": sport_key,
            "book_count": consensus.get("book_count", 0),
        }

    prediction = PredictionService(db).get_latest_prediction(str(game.id))
    now = datetime.now(timezone.utc)
    payload = {
        "available": True,
        "provider": provider,
        "sport_key": sport_key,
        "book_count": int(consensus.get("book_count") or 0),
        "consensus": {k: v for k, v in consensus.items() if k != "book_count"},
        "model_comparison": _model_comparison(consensus, prediction),
        "disclaimer": DISCLAIMER,
        "fetched_at_iso": now.isoformat(),
    }
    try:
        from app.services.odds_snapshot_service import maybe_record_odds_snapshot

        maybe_record_odds_snapshot(db, game, payload)
    except Exception:
        logger.exception("Failed to record odds snapshot for game %s", game.id)
    return payload


def load_game_for_odds(db: Session, game_id: str) -> Game | None:
    try:
        from uuid import UUID

        game_uuid = UUID(str(game_id).strip())
    except ValueError:
        return None
    return (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == game_uuid)
        .first()
    )
