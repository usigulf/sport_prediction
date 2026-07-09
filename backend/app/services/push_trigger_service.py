"""
Push triggers: kickoff alerts (~2h before), high-confidence picks, and post-game results
for favorited teams/leagues. Call from cron (script or internal API).
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Set

from sqlalchemy.orm import Session, joinedload

from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game
from app.models.user import User
from app.models.user_favorite import UserFavorite
from app.models.user_push_token import UserPushToken
from app.models.push_reminder_sent import PushReminderSent
from app.models.prediction import Prediction
from app.services.push_service import send_expo_push
from app.services.trust_metrics_service import (
    implied_draw_probability,
    prediction_correct_vs_result,
    select_pregame_prediction_for_accuracy,
)

logger = logging.getLogger(__name__)

REMINDER_GAME_STARTING = "game_starting_2h"
REMINDER_HIGH_CONFIDENCE = "high_confidence_pick"
REMINDER_POST_GAME = "post_game_result"
REMINDER_TRIAL_ENDING = "trial_ending_24h"

# Trial-ending: notify once when trial ends within this window (hours).
TRIAL_ENDING_WINDOW_HOURS = 24

# Cron runs every ~15 min; games with kickoff in this UTC window get a one-time alert.
KICKOFF_WINDOW_MIN_MINUTES = 110
KICKOFF_WINDOW_MAX_MINUTES = 130

# Estimated game length by league (hours) — send within 1h after this from kickoff.
ESTIMATED_GAME_HOURS: dict[str, float] = {
    "nfl": 3.25,
    "nba": 2.75,
    "mlb": 3.5,
    "nhl": 2.75,
}
DEFAULT_GAME_HOURS = 2.25
POST_GAME_SEND_WINDOW_HOURS = 1.0
POST_GAME_LOOKBACK_HOURS = 6.0


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


def _estimated_game_hours(league: Optional[str]) -> float:
    return ESTIMATED_GAME_HOURS.get((league or "").lower(), DEFAULT_GAME_HOURS)


def _in_post_game_send_window(game: Game, now: datetime) -> bool:
    """True when now is within 1h after estimated final whistle (UTC)."""
    kickoff = _as_utc(game.scheduled_time)
    if kickoff is None:
        return False
    duration_h = _estimated_game_hours(game.league)
    earliest = kickoff + timedelta(hours=duration_h)
    latest = kickoff + timedelta(hours=duration_h + POST_GAME_SEND_WINDOW_HOURS)
    return earliest <= now <= latest


def _predicted_outcome_label(
    game: Game, pred: Prediction, home_name: str, away_name: str,
) -> str:
    hp = float(pred.home_win_probability)
    ap = float(pred.away_win_probability)
    league = (game.league or "").lower()
    if league in SOCCER_LEAGUES_SET:
        dp = implied_draw_probability(hp, ap)
        probs = {"home": hp, "away": ap, "draw": dp}
        pick = max(probs, key=probs.get)
        if pick == "home":
            return f"{home_name} win"
        if pick == "away":
            return f"{away_name} win"
        return "Draw"
    if hp > ap:
        return f"{home_name} win"
    if ap > hp:
        return f"{away_name} win"
    return "Close matchup"


def _actual_result_label(game: Game, home_name: str, away_name: str) -> str:
    hs = game.home_score or 0
    aws = game.away_score or 0
    score_line = f"{hs}–{aws}"
    league = (game.league or "").lower()
    if hs > aws:
        winner = home_name
    elif aws > hs:
        winner = away_name
    else:
        if league in SOCCER_LEAGUES_SET:
            return f"Draw {score_line}"
        return f"Tie {score_line}"
    return f"{winner} won {score_line}"


def _post_game_result_body(
    game: Game, pred: Prediction, home_name: str, away_name: str,
) -> str:
    predicted = _predicted_outcome_label(game, pred, home_name, away_name)
    actual = _actual_result_label(game, home_name, away_name)
    if prediction_correct_vs_result(game, pred):
        return f"We predicted {predicted} — result: {actual}. We got it right."
    return f"We predicted {predicted} — result: {actual}."


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


def send_post_game_results(db: Session) -> int:
    """
    Send "We predicted X — result Y" after final for favorited teams/leagues.
    Uses pre-kickoff prediction (C-06 lock). Sends within ~1h of estimated final.
    Returns number of notifications sent.
    """
    now = _utc_now()
    lookback = now - timedelta(hours=POST_GAME_LOOKBACK_HOURS)

    games = db.query(Game).options(
        joinedload(Game.home_team),
        joinedload(Game.away_team),
    ).filter(
        Game.status.in_(["finished", "final"]),
        Game.scheduled_time >= lookback.replace(tzinfo=None),
        Game.scheduled_time <= now.replace(tzinfo=None),
    ).all()

    sent_count = 0
    for game in games:
        if not _in_post_game_send_window(game, now):
            continue
        pred = select_pregame_prediction_for_accuracy(db, game)
        if not pred:
            continue

        home_name = game.home_team.name if game.home_team else "Home"
        away_name = game.away_team.name if game.away_team else "Away"
        title = f"Final: {home_name} vs {away_name}"
        body = _post_game_result_body(game, pred, home_name, away_name)

        user_ids = _user_ids_for_game_reminder(db, game)
        for uid in user_ids:
            if _already_sent(db, uid, game.id, REMINDER_POST_GAME):
                continue
            tokens = _tokens_for_user_ids(db, {uid})
            if not tokens:
                continue
            send_expo_push(
                tokens,
                title,
                body,
                data={"type": "post_game_result", "game_id": str(game.id)},
            )
            _record_sent(db, uid, game.id, REMINDER_POST_GAME)
            sent_count += 1
    return sent_count


def send_trial_ending_reminders(db: Session) -> int:
    """
    Notify premium/trialing users ~24h before subscription_trial_end_at (Imp #46).
    """
    now = _utc_now()
    window_end = now + timedelta(hours=TRIAL_ENDING_WINDOW_HOURS)
    users = (
        db.query(User)
        .filter(
            User.subscription_trial_end_at.isnot(None),
            User.subscription_trial_end_at >= now.replace(tzinfo=None),
            User.subscription_trial_end_at <= window_end.replace(tzinfo=None),
            User.subscription_tier.in_(("premium", "trialing")),
            User.trial_ending_push_sent_at.is_(None),
        )
        .all()
    )
    sent_count = 0
    for user in users:
        uid = str(user.id)
        tokens = _tokens_for_user_ids(db, {uid})
        if not tokens:
            continue
        send_expo_push(
            tokens,
            "Your Premium trial ends soon",
            "Your free trial ends in about 24 hours. Manage or cancel in Settings → Subscriptions.",
            data={"type": "trial_ending"},
        )
        user.trial_ending_push_sent_at = now
        db.commit()
        sent_count += 1
    return sent_count


def send_trial_ending_reminders(db: Session) -> int:
    """
    Notify premium/trialing users ~24h before subscription_trial_end_at (Imp #46).
    """
    now = _utc_now()
    window_end = now + timedelta(hours=TRIAL_ENDING_WINDOW_HOURS)
    users = (
        db.query(User)
        .filter(
            User.subscription_trial_end_at.isnot(None),
            User.subscription_trial_end_at >= now.replace(tzinfo=None),
            User.subscription_trial_end_at <= window_end.replace(tzinfo=None),
            User.subscription_tier.in_(("premium", "trialing")),
            User.trial_ending_push_sent_at.is_(None),
        )
        .all()
    )
    sent_count = 0
    for user in users:
        uid = str(user.id)
        tokens = _tokens_for_user_ids(db, {uid})
        if not tokens:
            continue
        send_expo_push(
            tokens,
            "Your Premium trial ends soon",
            "Your free trial ends in about 24 hours. Manage or cancel in Settings → Subscriptions.",
            data={"type": "trial_ending"},
        )
        user.trial_ending_push_sent_at = now
        db.commit()
        sent_count += 1
    return sent_count
