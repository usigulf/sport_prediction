"""
Feed endpoints: top picks and personalized for-you feed.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import Callable, Optional, Set, Tuple

from app.database import get_db
from app.utils.calendar_window import utc_bounds_for_calendar_day
from app.api.deps import get_current_user, get_current_user_optional
from app.constants.leagues import ALLOWED_LEAGUE_CODES
from app.models.game import Game
from app.models.user import User
from app.models.user_favorite import UserFavorite
from app.utils.team_logo_urls import team_to_api_dict
from app.schemas.common import datetime_to_iso
from app.services.prediction_service import PredictionService
from app.services.prediction_payload import build_prediction_api_payload
from app.services.player_props_service import PROPS_DISCLAIMER, build_game_player_props
from app.services.data_quality_service import compute_prediction_quality
from app.services.guest_access_service import cap_guest_teaser_picks
from app.config import get_settings
from app.utils.subscription_tiers import is_free_tier_user

router = APIRouter(prefix="/feed", tags=["feed"])


def _team_to_response(team):
    return team_to_api_dict(team)


def _confidence_order(cl: Optional[str]) -> int:
    """Order: high=0, medium=1, low=2, null=3."""
    if cl == "high":
        return 0
    if cl == "medium":
        return 1
    if cl == "low":
        return 2
    return 3


def _parse_league_filter(league: Optional[str], leagues: Optional[str]) -> Optional[list[str]]:
    league_filter = leagues or league
    if not league_filter:
        return None
    league_list = [s.strip().lower() for s in league_filter.split(",") if s.strip()]
    return league_list or None


def _games_query(
    db: Session,
    *,
    date: Optional[str],
    time_zone: Optional[str],
    league_list: Optional[list[str]],
    fetch_limit: int,
):
    if date:
        try:
            start_utc, end_utc = utc_bounds_for_calendar_day(date, time_zone)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        query = (
            db.query(Game)
            .filter(
                Game.scheduled_time >= start_utc,
                Game.scheduled_time < end_utc,
                Game.status.in_(("scheduled", "live", "finished")),
            )
            .options(joinedload(Game.home_team), joinedload(Game.away_team))
        )
    else:
        now = datetime.now()
        today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = (
            db.query(Game)
            .filter(
                Game.status == "scheduled",
                Game.scheduled_time >= now,
                Game.scheduled_time <= today_end,
            )
            .options(joinedload(Game.home_team), joinedload(Game.away_team))
        )
    if league_list:
        query = query.filter(Game.league.in_(league_list))
    return query.order_by(Game.scheduled_time).limit(fetch_limit).all()


def _attach_prediction_for_user(
    db: Session,
    prediction_service: PredictionService,
    current_user: Optional[User],
    game: Game,
    pred,
) -> Optional[dict]:
    """Build prediction payload if user quota allows; records free-tier views."""
    if pred is None:
        return None
    if current_user is not None:
        if not prediction_service.grant_free_tier_prediction_view(current_user, game.id):
            return None
    return build_prediction_api_payload(db, game, pred)


def _serialize_pick(
    db: Session,
    game: Game,
    pred,
    include_predictions: bool,
    *,
    prediction_service: Optional[PredictionService] = None,
    current_user: Optional[User] = None,
) -> dict:
    game_dict = {
        "id": str(game.id),
        "league": game.league,
        "home_team_id": str(game.home_team_id),
        "away_team_id": str(game.away_team_id),
        "home_team": _team_to_response(game.home_team),
        "away_team": _team_to_response(game.away_team),
        "scheduled_time": datetime_to_iso(game.scheduled_time),
        "status": game.status,
        "home_score": game.home_score,
        "away_score": game.away_score,
        "venue": game.venue,
        "prediction": None,
    }
    if include_predictions and pred and prediction_service is not None:
        payload = _attach_prediction_for_user(
            db, prediction_service, current_user, game, pred
        )
        if payload is not None:
            game_dict["prediction"] = payload
    elif pred and include_predictions and prediction_service is None:
        # Guest path: attach without quota (teaser cap applied upstream).
        game_dict["prediction"] = build_prediction_api_payload(db, game, pred)
    return game_dict


def _load_user_favorites(db: Session, user_id) -> Tuple[Set[str], Set[str]]:
    favorites = db.query(UserFavorite).filter(UserFavorite.user_id == user_id).all()
    team_ids = {str(f.entity_id) for f in favorites if f.entity_type == "team"}
    league_codes = {
        f.entity_id.lower()
        for f in favorites
        if f.entity_type == "league" and f.entity_id.lower() in ALLOWED_LEAGUE_CODES
    }
    return team_ids, league_codes


def _personalization_tier(
    game: Game,
    favorite_team_ids: Set[str],
    favorite_leagues: Set[str],
) -> int:
    home_id = str(game.home_team_id)
    away_id = str(game.away_team_id)
    if home_id in favorite_team_ids or away_id in favorite_team_ids:
        return 0
    if game.league.lower() in favorite_leagues:
        return 1
    return 2


def _build_picks(
    db: Session,
    *,
    games: list[Game],
    current_user: Optional[User],
    limit: int,
    sort_key: Callable,
) -> list[dict]:
    prediction_service = PredictionService(db)
    with_pred = []
    threshold = float(get_settings().min_data_quality_score)
    for game in games:
        pred = prediction_service.get_latest_prediction(str(game.id))
        if not pred:
            continue
        quality = compute_prediction_quality(db, game, pred, threshold=threshold)
        if quality["quality_gate_applied"]:
            continue
        with_pred.append((game, pred))

    with_pred.sort(key=sort_key)

    picks = []
    for game, pred in with_pred[:limit]:
        picks.append(
            _serialize_pick(
                db,
                game,
                pred,
                True,
                prediction_service=prediction_service,
                current_user=current_user,
            )
        )
    return picks


@router.get("/top-picks")
async def get_top_picks(
    league: Optional[str] = Query(None, description="Filter by single league (alias for leagues=)"),
    leagues: Optional[str] = Query(None, description="Filter by leagues (comma-separated)"),
    limit: int = Query(20, ge=1, le=50),
    date: Optional[str] = Query(
        None,
        description="Calendar day (YYYY-MM-DD). With time_zone, same local day as /games/upcoming; includes scheduled, live, and finished.",
    ),
    time_zone: Optional[str] = Query(
        None,
        description="IANA timezone (e.g. America/New_York). Use with date for soccer/model alignment.",
    ),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Top picks: games with predictions, ordered by confidence (high first) then kickoff.
    Without date: legacy window — scheduled only, from now through end of server local calendar day.
    With date (+ optional time_zone): same UTC window as GET /games/upcoming for that day.
    Public; if user is free and over daily limit, predictions are omitted.
    """
    league_list = _parse_league_filter(league, leagues)
    games = _games_query(
        db,
        date=date,
        time_zone=time_zone,
        league_list=league_list,
        fetch_limit=limit * 2,
    )

    def sort_key(item):
        game, pred = item
        return (
            _confidence_order(pred.confidence_level if pred else None),
            game.scheduled_time,
        )

    picks = _build_picks(db, games=games, current_user=current_user, limit=limit, sort_key=sort_key)
    if current_user is None:
        picks = cap_guest_teaser_picks(
            picks, limit=int(get_settings().guest_teaser_pick_limit)
        )
    return {"picks": picks, "count": len(picks)}


@router.get("/for-you")
async def get_for_you_feed(
    league: Optional[str] = Query(None, description="Filter by single league (alias for leagues=)"),
    leagues: Optional[str] = Query(None, description="Filter by leagues (comma-separated)"),
    limit: int = Query(10, ge=1, le=50),
    date: Optional[str] = Query(
        None,
        description="Calendar day (YYYY-MM-DD). With time_zone, same local day as /games/upcoming.",
    ),
    time_zone: Optional[str] = Query(
        None,
        description="IANA timezone (e.g. America/New_York). Use with date for soccer/model alignment.",
    ),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Personalized feed for Home "Best Picks for You".
    Logged-in users with favorites see favorite-team games first, then favorite leagues,
    then other high-confidence picks. Guests fall back to top-picks ordering.
    """
    league_list = _parse_league_filter(league, leagues)
    games = _games_query(
        db,
        date=date,
        time_zone=time_zone,
        league_list=league_list,
        fetch_limit=limit * 4,
    )

    favorite_team_ids: Set[str] = set()
    favorite_leagues: Set[str] = set()
    personalized = False
    if current_user:
        favorite_team_ids, favorite_leagues = _load_user_favorites(db, current_user.id)
        personalized = bool(favorite_team_ids or favorite_leagues)

    def sort_key(item):
        game, pred = item
        tier = (
            _personalization_tier(game, favorite_team_ids, favorite_leagues)
            if personalized
            else 2
        )
        return (
            tier,
            _confidence_order(pred.confidence_level if pred else None),
            game.scheduled_time,
        )

    picks = _build_picks(db, games=games, current_user=current_user, limit=limit, sort_key=sort_key)
    if current_user is None:
        picks = cap_guest_teaser_picks(
            picks, limit=int(get_settings().guest_teaser_pick_limit)
        )
    return {"picks": picks, "count": len(picks), "personalized": personalized}


def _premium_required(user: User) -> None:
    if is_free_tier_user(user):
        raise HTTPException(
            status_code=403,
            detail="Player props require a premium subscription.",
        )


@router.get("/player-props")
async def get_player_props_feed(
    league: Optional[str] = Query(None, description="Filter by single league (alias for leagues=)"),
    leagues: Optional[str] = Query(None, description="Filter by leagues (comma-separated)"),
    limit: int = Query(20, ge=1, le=50),
    date: Optional[str] = Query(None, description="Calendar day (YYYY-MM-DD)"),
    time_zone: Optional[str] = Query(None, description="IANA timezone"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Games with model-projected player props (Premium). For Games tab Props view.
    """
    _premium_required(current_user)
    league_list = _parse_league_filter(league, leagues)
    games = _games_query(
        db,
        date=date,
        time_zone=time_zone,
        league_list=league_list,
        fetch_limit=limit * 3,
    )
    prediction_service = PredictionService(db)
    items = []
    for game in games:
        pred = prediction_service.get_latest_prediction(str(game.id))
        if not pred:
            continue
        payload = build_game_player_props(db, game, pred)
        if not payload["props"]:
            continue
        items.append(
            {
                "game": {
                    "id": str(game.id),
                    "league": game.league,
                    "home_team": _team_to_response(game.home_team),
                    "away_team": _team_to_response(game.away_team),
                    "scheduled_time": datetime_to_iso(game.scheduled_time),
                    "status": game.status,
                },
                "props": payload["props"][:3],
                "prop_count": payload["count"],
                "has_named_players": payload["has_named_players"],
            }
        )
        if len(items) >= limit:
            break

    return {"items": items, "count": len(items), "disclaimer": PROPS_DISCLAIMER}


@router.get("/widget/top-pick")
async def get_widget_top_pick(
    db: Session = Depends(get_db),
):
    """
    Minimal public pick for iOS WidgetKit (I70).
    Returns the highest-confidence scheduled pick today — informational only.
    """
    games = _games_query(
        db,
        date=None,
        time_zone=None,
        league_list=None,
        fetch_limit=40,
    )

    def sort_key(item):
        game, pred = item
        return (
            _confidence_order(pred.confidence_level if pred else None),
            game.scheduled_time,
        )

    picks = _build_picks(
        db,
        games=games,
        current_user=None,
        limit=1,
        sort_key=sort_key,
    )
    if not picks:
        return {
            "pick": None,
            "disclaimer": "Informational only — not betting advice.",
        }
    top = picks[0]
    pred = top.get("prediction") or {}
    home = (top.get("home_team") or {}).get("name") or "Home"
    away = (top.get("away_team") or {}).get("name") or "Away"
    hp = pred.get("home_win_probability")
    headline = f"{home} favored" if hp and float(hp) >= 0.5 else f"{away} favored"
    return {
        "pick": {
            "game_id": top.get("id"),
            "headline": headline,
            "matchup": f"{home} vs {away}",
            "confidence": pred.get("confidence_level") or "",
            "scheduled_time_iso": top.get("scheduled_time"),
        },
        "disclaimer": "Informational only — not betting advice.",
    }
