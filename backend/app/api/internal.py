"""
Internal endpoints for cron or ops (e.g. push triggers, prediction refresh). Protected by PUSH_CRON_SECRET when set.
"""
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Body, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_settings
from app.models.game import Game
from app.models.game_player_spotlight import GamePlayerSpotlight
from app.services.push_trigger_service import send_game_starting_reminders, send_high_confidence_picks
from app.services.prediction_inference_service import run_prediction_job
from app.services.sportradar_nfl_service import fetch_nfl_standings_json
from app.services.sportradar_soccer_service import soccer_health_probe
from app.services.sportradar_soccer_schedule_sync import sync_soccer_schedule_for_league

router = APIRouter(prefix="/internal", tags=["internal"])


class PredictionRunBody(BaseModel):
    game_ids: Optional[list[str]] = None
    force: bool = False
    min_minutes_scheduled: int = Field(45, ge=1, le=1440)
    min_minutes_live: int = Field(2, ge=1, le=120)


class PlayerSpotlightItem(BaseModel):
    player_name: str = Field(..., max_length=255)
    team_name: str = Field(..., max_length=255)
    role: Optional[str] = Field(None, max_length=120)
    summary: str = Field(..., max_length=8000)
    sort_order: int = 0


class ReplacePlayerSpotlightsBody(BaseModel):
    """Full replace: existing rows for this game are deleted, then these are inserted."""

    spotlights: list[PlayerSpotlightItem] = Field(default_factory=list)


def _require_cron_secret(x_cron_secret: str = Header(None, alias="X-Cron-Secret")):
    settings = get_settings()
    if not settings.push_cron_secret:
        raise HTTPException(
            status_code=501,
            detail="Internal cron not configured (set PUSH_CRON_SECRET for push triggers and prediction refresh)",
        )
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


@router.post("/predictions/run")
async def run_predictions_cron(
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
    body: PredictionRunBody = Body(default_factory=PredictionRunBody),
):
    """
    Refresh ML predictions for live + upcoming games. Schedule via cron every 15–60 minutes with header:
    X-Cron-Secret: <PUSH_CRON_SECRET>

    Set EXPLANATION_MODEL_DIR or MODEL_ARTIFACT_DIR to a folder with simple_model.pkl + feature_columns.pkl
    for sklearn inference; otherwise a deterministic heuristic runs from game state.
    """
    result = run_prediction_job(
        db,
        game_ids=body.game_ids,
        force=body.force,
        min_minutes_scheduled=body.min_minutes_scheduled,
        min_minutes_live=body.min_minutes_live,
    )
    return {
        "games_considered": result.games_considered,
        "predictions_written": result.predictions_written,
        "skipped_cooldown": result.skipped_cooldown,
        "errors": result.errors,
    }


@router.put("/games/{game_id}/player-spotlights")
async def replace_game_player_spotlights(
    game_id: str,
    body: ReplacePlayerSpotlightsBody,
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
):
    """
    Replace all performer spotlight rows for a game (ETL / admin). Same auth as cron:
    X-Cron-Secret: <PUSH_CRON_SECRET>
    """
    try:
        gid = UUID(game_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game ID format")
    game = db.query(Game).filter(Game.id == gid).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    db.query(GamePlayerSpotlight).filter(GamePlayerSpotlight.game_id == gid).delete()
    for item in body.spotlights:
        db.add(
            GamePlayerSpotlight(
                id=uuid4(),
                game_id=gid,
                player_name=item.player_name,
                team_name=item.team_name,
                role=item.role,
                summary=item.summary,
                sort_order=item.sort_order,
            )
        )
    db.commit()
    return {"game_id": game_id, "spotlights_written": len(body.spotlights)}


@router.delete("/games/{game_id}/player-spotlights")
async def clear_game_player_spotlights(
    game_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
):
    """Remove all spotlight rows for a game."""
    try:
        gid = UUID(game_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game ID format")
    n = db.query(GamePlayerSpotlight).filter(GamePlayerSpotlight.game_id == gid).delete()
    db.commit()
    return {"game_id": game_id, "spotlights_deleted": n}


@router.post("/soccer/sync-schedules")
async def soccer_sync_schedules(
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
):
    """
    Import Premier League and Champions League fixtures from Sportradar season schedules into `teams` / `games`.
    Uses the same season env vars as standings (`SPORTRADAR_SOCCER_SEASON_*`). Game IDs are stable (uuid5 of Sportradar sport_event id).
    After sync, run POST /internal/predictions/run to generate predictions for upcoming/live games.
    """
    settings = get_settings()
    results = []
    for lg in ("premier_league", "champions_league"):
        r = sync_soccer_schedule_for_league(db, lg, settings)
        results.append(
            {
                "league": r.app_league,
                "season_id": r.season_id or None,
                "rows_fetched": r.rows_fetched,
                "games_upserted": r.games_upserted,
                "rows_skipped": r.rows_skipped,
                "errors": r.errors,
            }
        )
    return {"results": results}


@router.get("/health/sportradar")
async def sportradar_health(_: None = Depends(_require_cron_secret)):
    """
    Verify Sportradar NFL and (optionally) soccer standings can be fetched (same X-Cron-Secret).
    Does not persist data; uses the same caches as explanation enrichment.
    """
    settings = get_settings()
    key = (settings.sportradar_api_key or "").strip()
    if not key:
        return {
            "configured": False,
            "nfl_standings_ok": False,
            "standings_source": None,
            "detail": "SPORTRADAR_API_KEY not set",
            **soccer_health_probe(settings),
        }
    data, label = fetch_nfl_standings_json(settings)
    out = {
        "configured": True,
        "nfl_standings_ok": data is not None,
        "standings_source": label,
        "access_level": settings.sportradar_access_level,
        "season_year_effective": settings.sportradar_nfl_season_year,
    }
    out.update(soccer_health_probe(settings))
    return out
