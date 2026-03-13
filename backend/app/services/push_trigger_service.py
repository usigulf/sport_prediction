"""
Push triggers: send "Game starting in 1 hour" and "High-confidence pick ready" to users with favorite teams.
Call from cron (script or internal API).
"""
import logging
from datetime import datetime, timedelta
from typing import List, Set, Tuple

from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.models.user_favorite import UserFavorite
from app.models.user_push_token import UserPushToken
from app.models.push_reminder_sent import PushReminderSent
from app.models.prediction import Prediction
from app.services.push_service import send_expo_push

logger = logging.getLogger(__name__)

REMINDER_GAME_STARTING = "game_starting_1h"
REMINDER_HIGH_CONFIDENCE = "high_confidence_pick"


def _user_ids_with_team_favorite(db: Session, team_ids: List) -> Set:
    """Return set of user_id (as str) that have any of team_ids in their team favorites."""
    if not team_ids:
        return set()
    ids_str = [str(t) for t in team_ids]
    rows = db.query(UserFavorite.user_id).filter(
        UserFavorite.entity_type == "team",
        UserFavorite.entity_id.in_(ids_str),
    ).distinct().all()
    return {str(r[0]) for r in rows}


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
    Send "Game starting in ~1 hour" to users who have either team in favorites.
    Only for games with scheduled_time in [now+50min, now+70min].
    Returns number of reminders sent.
    """
    now = datetime.now()
    window_start = now + timedelta(minutes=50)
    window_end = now + timedelta(minutes=70)

    games = db.query(Game).options(
        joinedload(Game.home_team),
        joinedload(Game.away_team),
    ).filter(
        Game.status == "scheduled",
        Game.scheduled_time >= window_start,
        Game.scheduled_time <= window_end,
    ).all()

    sent_count = 0
    for game in games:
        home_name = game.home_team.name if game.home_team else "Home"
        away_name = game.away_team.name if game.away_team else "Away"
        title = "Game starting soon"
        body = f"{home_name} vs {away_name} in about 1 hour"

        user_ids = _user_ids_with_team_favorite(db, [game.home_team_id, game.away_team_id])
        for uid in user_ids:
            if _already_sent(db, uid, game.id, REMINDER_GAME_STARTING):
                continue
            tokens = _tokens_for_user_ids(db, {uid})
            if tokens:
                send_expo_push(tokens, title, body, data={"type": "game_reminder", "game_id": str(game.id)})
                _record_sent(db, uid, game.id, REMINDER_GAME_STARTING)
                sent_count += 1
    return sent_count


def send_high_confidence_picks(db: Session) -> int:
    """
    Send "High-confidence pick ready" to users who have either team in favorites.
    Only for games that have a prediction with confidence_level='high' and game is still in the future.
    Returns number of notifications sent.
    """
    now = datetime.now()

    # Games that have a high-confidence prediction and are still upcoming
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
        Game.scheduled_time >= now,
    ).all()

    sent_count = 0
    for game in games:
        home_name = game.home_team.name if game.home_team else "Home"
        away_name = game.away_team.name if game.away_team else "Away"
        title = "High-confidence pick ready"
        body = f"{home_name} vs {away_name}"

        user_ids = _user_ids_with_team_favorite(db, [game.home_team_id, game.away_team_id])
        for uid in user_ids:
            if _already_sent(db, uid, game.id, REMINDER_HIGH_CONFIDENCE):
                continue
            tokens = _tokens_for_user_ids(db, {uid})
            if tokens:
                send_expo_push(tokens, title, body, data={"type": "high_confidence", "game_id": str(game.id)})
                _record_sent(db, uid, game.id, REMINDER_HIGH_CONFIDENCE)
                sent_count += 1
    return sent_count
