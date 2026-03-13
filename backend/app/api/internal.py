"""
Internal endpoints for cron or ops (e.g. push triggers). Protected by PUSH_CRON_SECRET when set.
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_settings
from app.services.push_trigger_service import send_game_starting_reminders, send_high_confidence_picks

router = APIRouter(prefix="/internal", tags=["internal"])


def _require_cron_secret(x_cron_secret: str = Header(None, alias="X-Cron-Secret")):
    settings = get_settings()
    if not settings.push_cron_secret:
        raise HTTPException(status_code=501, detail="Push triggers not configured (set PUSH_CRON_SECRET)")
    if x_cron_secret != settings.push_cron_secret:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Cron-Secret")


@router.post("/push-triggers/run")
async def run_push_triggers(
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
):
    """
    Run game-starting and high-confidence push triggers. Call from cron with header:
    X-Cron-Secret: <PUSH_CRON_SECRET>
    """
    n_reminders = send_game_starting_reminders(db)
    n_picks = send_high_confidence_picks(db)
    return {"game_reminders_sent": n_reminders, "high_confidence_picks_sent": n_picks}
