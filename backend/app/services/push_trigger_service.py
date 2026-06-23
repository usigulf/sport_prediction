"""
Push triggers: kickoff alerts (~2h before) and high-confidence picks for favorited teams/leagues.
Call from cron (script or internal API).
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Set

from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.models.user_favorite import UserFavorite
from app.models.user_push_token import UserPushToken
from app.models.push_reminder_sent import PushReminderSent
from app.models.prediction import Prediction
from app.services.push_service import send_expo_push

logger = logging.getLogger(__name__)

REMINDER_GAME_STARTING = "game_starting_2h"
REMINDER_HIGH_CONFIDENCE = "high_confidence_pick"

# Cron runs every ~15 min; games with kickoff in this UTC window get a one-time alert.
KICKOFF_WINDOW_MIN_MINUTES = 110
KICKOFF_WINDOW_MAX_MINUTES = 130


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _user_ids_with_team_favorite(db: Session, team_ids: List) -> Set[str]:
    """Return set of user_id (as str) that have any of team_ids in their team favorites."""
    if not team_ids:
        return set()
    ids_str = [str(t) for t in team_ids]
    rows = db.query(UserFavorite.user_id).filter(
        UserFavorite.entity_type == "team",
        UserFavorite.entity_id.in_(ids_str),
    ).distinct().all()
    return {str(r[0]) for r in rows}


def _user_ids_with_league_favorite(db: Session, league: Optional[str]) -> Set[str]:
    if not league:
        return set()
    rows = db.query(UserFavorite.user_id).filter(
        UserFavorite.entity_type == "league",
        UserFavorite.entity_id == league,
    ).distinct().all()
    return {str(r[0]) for r in rows}


def _user_ids_for_game_reminder(db: Session, game: Game) -> Set[str]:
    team_ids = _user_ids_with_team_favorite(db, [game.home_team_id, game.away_team_id])
    league_ids = _user_ids_with_league_favorite(db, game.league)
    return team_ids | league_ids


def _favorited_team_ids_for_user(
    db: Session, user_id: str, home_team_id, away_team_id,
) -> Set[str]:
    matchup_ids = [str(home_team_id), str(away_team_id)]
    rows = db.query(UserFavorite.entity_id).filter(
        UserFavorite.user_id == user_id,
        UserFavorite.entity_type == "team",
        UserFavorite.entity_id.in_(matchup_ids),
    ).all()
    return {str(r[0]) for r in rows}


def _kickoff_reminder_body(
    home_name: str,
    away_name: str,
    home_team_id,
    away_team_id,
    favorited_team_ids: Set[str],
) -> str:
    home_id = str(home_team_id)
    away_id = str(away_team_id)
    if home_id in favorited_team_ids:
        return f"Your team {home_name} plays in about 2 hours vs {away_name}"
    if away_id in favorited_team_ids:
        return f"Your team {away_name} plays in about 2 hours vs {home_name}"
    return f"{home_name} vs {away_name} kicks off in about 2 hours"


def _tokens_for_user_ids(db: Session, user_ids: Set[str]) -> List[str]:
    """Get all Expo push tokens for the given user IDs."""
    if not user_ids:
        return []
    tokens = db.query(UserPushToken.token).filter(
        UserPushToken.user_id.in_(user_ids),
    ).all()
    return [t[0] for t in tokens if t[0]]


def _already_sent(db: Session, user_id: str, game_id, reminder_type: str) -> bool:
    return db.query(PushReminderSent).filter(
        PushReminderSent.user_id == user_id,
        PushReminderSent.game_id == game_id,
        PushReminderSent.reminder_type == reminder_type,
    ).first() is not None


def _record_sent(db: Session, user_id: str, game_id, reminder_type: str) -> None:
    row = PushReminderSent(user_id=user_id, game_id=game_id, reminder_type=reminder_type)
    db.add(row)
    db.commit()


def send_game_starting_reminders(db: Session) -> int:
    """
    Send kickoff alert (~2 hours before) to users who favorited either team or the league.
    Only for games with scheduled_time in [now+110min, now+130min] (UTC).
    Returns number of reminders sent.
    """
    now = _utc_now()
    window_start = now + timedelta(minutes=KICKOFF_WINDOW_MIN_MINUTES)
    window_end = now + timedelta(minutes=KICKOFF_WINDOW_MAX_MINUTES)

    games = db.query(Game).options(
        joinedload(Game.home_team),
        joinedload(Game.away_team),
    ).filter(
        Game.status == "scheduled",
        Game.scheduled_time >= window_start.replace(tzinfo=None),
        Game.scheduled_time <= window_end.replace(tzinfo=None),
    ).all()

    sent_count = 0
    for game in games:
        kickoff = _as_utc(game.scheduled_time)
        if kickoff is None or kickoff < window_start or kickoff > window_end:
            continue

        home_name = game.home_team.name if game.home_team else "Home"
        away_name = game.away_team.name if game.away_team else "Away"
        title = "Your team plays soon"

        user_ids = _user_ids_for_game_reminder(db, game)
        for uid in user_ids:
            if _already_sent(db, uid, game.id, REMINDER_GAME_STARTING):
                continue
            tokens = _tokens_for_user_ids(db, {uid})
            if not tokens:
                continue
            fav_teams = _favorited_team_ids_for_user(
                db, uid, game.home_team_id, game.away_team_id,
            )
            body = _kickoff_reminder_body(
                home_name, away_name, game.home_team_id, game.away_team_id, fav_teams,
            )
            send_expo_push(
                tokens,
                title,
                body,
                data={"type": "game_reminder", "game_id": str(game.id)},
            )
            _record_sent(db, uid, game.id, REMINDER_GAME_STARTING)
            sent_count += 1
    return sent_count


def send_high_confidence_picks(db: Session) -> int:
    """
    Send "High-confidence pick ready" to users who have either team in favorites.
    Only for games that have a prediction with confidence_level='high' and game is still in the future.
    Returns number of notifications sent.
    """
    now = _utc_now()

    subq = db.query(Prediction.game_id).filter(
        Prediction.confidence_level == "high",
    ).distinct()
    game_ids = [r[0] for r in subq.all()]

    games = db.query(Game).options(
        joinedload(Game.home_team),
        joinedload(Game.away_team),
    ).filter(
        Game.id.in_(game_ids),
        Game.status == "scheduled",
        Game.scheduled_time >= now.replace(tzinfo=None),
    ).all()

    sent_count = 0
    for game in games:
        kickoff = _as_utc(game.scheduled_time)
        if kickoff is None or kickoff < now:
            continue

        home_name = game.home_team.name if game.home_team else "Home"
        away_name = game.away_team.name if game.away_team else "Away"
        title = "High-confidence pick ready"
        body = f"{home_name} vs {away_name}"

        user_ids = _user_ids_for_game_reminder(db, game)
        for uid in user_ids:
            if _already_sent(db, uid, game.id, REMINDER_HIGH_CONFIDENCE):
                continue
            tokens = _tokens_for_user_ids(db, {uid})
            if tokens:
                send_expo_push(tokens, title, body, data={"type": "high_confidence", "game_id": str(game.id)})
                _record_sent(db, uid, game.id, REMINDER_HIGH_CONFIDENCE)
                sent_count += 1
    return sent_count
