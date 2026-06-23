"""
Internal endpoints for cron or ops (e.g. push triggers, prediction refresh). Protected by PUSH_CRON_SECRET when set.
"""
import ipaddress
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_settings
from app.models.game import Game
from app.models.game_player_spotlight import GamePlayerSpotlight
from app.services.push_trigger_service import send_game_starting_reminders, send_high_confidence_picks, send_post_game_results
from app.services.prediction_inference_service import run_prediction_job
from app.services.model_training import train_and_save
from app.services.sportradar_nfl_service import fetch_nfl_standings_json
from app.services.sportradar_soccer_service import soccer_health_probe
from app.services.soccer_data_provider import configured_soccer_league_codes, use_clearsports_soccer
from app.services.game_status_reconcile import reconcile_past_scheduled_games
from app.services.soccer_sync_dispatch import sync_soccer_schedule_for_league, sync_soccer_standings_for_league
from app.services.clearsports_client import clearsports_health_probe
from app.services.clearsports_soccer_service import clearsports_soccer_health_probe
from app.services.live_sync_service import run_live_sync_pipeline
from app.services.us_sports_sync_dispatch import sync_all_us_schedules, us_sync_result_payload
from app.services.clearsports_us_service import clearsports_us_health_probe

router = APIRouter(prefix="/internal", tags=["internal"])


class PredictionRunBody(BaseModel):
    game_ids: Optional[list[str]] = None
    force: bool = False
    min_minutes_scheduled: int = Field(45, ge=1, le=1440)
    min_minutes_live: int = Field(2, ge=1, le=120)
    include_recent_finished_days: int = Field(
        0,
        ge=0,
        le=90,
        description="Also predict finished games in the last N days (soccer beta backfill / top-picks).",
    )
    leagues: Optional[list[str]] = Field(
        None,
        description="Optional league filter (e.g. ['premier_league']).",
    )


class PlayerSpotlightItem(BaseModel):
    player_name: str = Field(..., max_length=255)
    team_name: str = Field(..., max_length=255)
    role: Optional[str] = Field(None, max_length=120)
    summary: str = Field(..., max_length=8000)
    sort_order: int = 0


class ReplacePlayerSpotlightsBody(BaseModel):
    """Full replace: existing rows for this game are deleted, then these are inserted."""

    spotlights: list[PlayerSpotlightItem] = Field(default_factory=list)


class TrainModelBody(BaseModel):
    """Train sklearn artifacts from finished games in the DB."""

    out_dir: Optional[str] = Field(
        None,
        description="Directory for simple_model.pkl + feature_columns.pkl + metrics.json. "
        "Defaults to MODEL_ARTIFACT_DIR / EXPLANATION_MODEL_DIR.",
    )
    test_frac: float = Field(0.2, ge=0.05, le=0.5)
    min_games: int = Field(60, ge=10, le=10000)
    min_publish_holdout_per_league_group: Optional[int] = Field(
        None,
        ge=1,
        le=10000,
        description="Min decisive holdout games per league group before writing pickles (default from settings).",
    )
    force: bool = Field(False, description="Train even when usable games < min_games.")


def _request_ip_for_internal(request: Request) -> str:
    settings = get_settings()
    if settings.trust_forwarded_headers:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _is_ip_allowed(ip: str, allowed_cidrs_raw: str) -> bool:
    cidrs = [c.strip() for c in (allowed_cidrs_raw or "").split(",") if c.strip()]
    if not cidrs:
        return True
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for c in cidrs:
        try:
            if addr in ipaddress.ip_network(c, strict=False):
                return True
        except ValueError:
            # Validation also happens in config; malformed entries fail closed here.
            continue
    return False


def _require_cron_secret(
    request: Request,
    x_cron_secret: str = Header(None, alias="X-Cron-Secret"),
):
    settings = get_settings()
    if not settings.push_cron_secret:
        raise HTTPException(
            status_code=501,
            detail="Internal cron not configured (set PUSH_CRON_SECRET for push triggers and prediction refresh)",
        )
    if x_cron_secret != settings.push_cron_secret:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Cron-Secret")
    if settings.internal_allowed_cidrs:
        ip = _request_ip_for_internal(request)
        if not _is_ip_allowed(ip, settings.internal_allowed_cidrs):
            raise HTTPException(status_code=403, detail="Internal endpoint access denied for client IP")


@router.post("/push-triggers/run")
async def run_push_triggers(
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
):
    """
    Run game-starting, high-confidence, and post-game push triggers. Call from cron with header:
    X-Cron-Secret: <PUSH_CRON_SECRET>
    """
    n_reminders = send_game_starting_reminders(db)
    n_picks = send_high_confidence_picks(db)
    n_post_game = send_post_game_results(db)
    return {
        "game_reminders_sent": n_reminders,
        "high_confidence_picks_sent": n_picks,
        "post_game_results_sent": n_post_game,
    }


class LiveSyncBody(BaseModel):
    min_minutes_live: int = Field(1, ge=1, le=10)


@router.post("/live/sync-run")
async def run_live_sync_cron(
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
    body: LiveSyncBody = Body(default_factory=LiveSyncBody),
):
    """
    High-frequency pipeline when games are live: refresh provider scores for active leagues,
    then re-run ML with inplay_v0 tagging (cooldown min_minutes_live). No-op when nothing is live.
    Schedule every 1–2 minutes via scripts/cron/internal_live_sync_run.sh.
    """
    result = run_live_sync_pipeline(db, min_minutes_live=body.min_minutes_live)
    return {
        "live_games": result.live_games,
        "leagues_synced": result.leagues_synced,
        "schedule_sync": result.schedule_sync,
        "predictions_written": result.predictions_written,
        "skipped_cooldown": result.skipped_cooldown,
        "prediction_errors": result.prediction_errors,
    }


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
        include_recent_finished_days=body.include_recent_finished_days,
        leagues=body.leagues,
    )
    return {
        "games_considered": result.games_considered,
        "predictions_written": result.predictions_written,
        "skipped_cooldown": result.skipped_cooldown,
        "errors": result.errors,
    }


@router.post("/ml/train")
async def train_model_cron(
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
    body: TrainModelBody = Body(default_factory=TrainModelBody),
):
    """
    Retrain the win-probability model from finished games and write sklearn artifacts.
    Schedule weekly (after standings + results sync) with X-Cron-Secret.

    Writes simple_model.pkl + feature_columns.pkl + metrics.json to out_dir
    (MODEL_ARTIFACT_DIR / EXPLANATION_MODEL_DIR, or body.out_dir). In Docker the
    API mount at /models is read-only — use scripts/cron/internal_train_model.sh
    on the host to write into ml/models, or pass a writable out_dir here.
    """
    settings = get_settings()
    out_dir = (body.out_dir or settings.model_artifact_dir or settings.explanation_model_dir or "").strip()
    if not out_dir:
        raise HTTPException(
            status_code=503,
            detail="Model output dir not configured (set MODEL_ARTIFACT_DIR or pass out_dir)",
        )
    try:
        summary = train_and_save(
            db,
            out_dir,
            test_frac=body.test_frac,
            min_games=body.min_games,
            min_publish_holdout_per_league_group=body.min_publish_holdout_per_league_group,
            force=body.force,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except OSError as e:
        raise HTTPException(
            status_code=507,
            detail=f"Could not write model artifacts to {out_dir}: {e}",
        )
    return summary


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
    For each configured soccer league: import fixtures into `teams`/`games`, then upsert `team_standings`.
    Uses ClearSports when CLEARSPORTS_API_KEY is set and Sportradar is not; otherwise Sportradar season feeds.
    After sync, run POST /internal/predictions/run.
    """
    settings = get_settings()
    results = []
    for lg in configured_soccer_league_codes(settings):
        r_sched = sync_soccer_schedule_for_league(db, lg, settings)
        r_std = sync_soccer_standings_for_league(db, lg, settings)
        results.append(
            {
                "league": r_sched.app_league,
                "season_id": r_sched.season_id or r_std.season_id or None,
                "rows_fetched": r_sched.rows_fetched,
                "games_upserted": r_sched.games_upserted,
                "rows_skipped": r_sched.rows_skipped,
                "standings_rows_seen": r_std.rows_seen,
                "standings_upserted": r_std.upserted,
                "standings_skipped": r_std.skipped,
                "errors": list(r_sched.errors) + list(r_std.errors),
            }
        )
    reconciled = reconcile_past_scheduled_games(db)
    return {"results": results, "reconciled_past_scheduled": reconciled}


@router.post("/us-sports/sync-schedules")
async def us_sports_sync_schedules(
    db: Session = Depends(get_db),
    _: None = Depends(_require_cron_secret),
):
    """
    Import NFL and NBA schedules. Uses ClearSports when CLEARSPORTS_API_KEY is set;
    otherwise Sportradar (SPORTRADAR_API_KEY). Then POST /internal/predictions/run.
    """
    settings = get_settings()
    results = sync_all_us_schedules(db, settings)
    return {"results": [us_sync_result_payload(r) for r in results]}


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


@router.get("/health/clearsports")
async def clearsports_health(_: None = Depends(_require_cron_secret)):
    """
    Verify ClearSports API key (EPL games probe) and soccer feed when key is the active provider.
    """
    settings = get_settings()
    out = clearsports_health_probe(settings)
    if use_clearsports_soccer(settings):
        out.update(clearsports_soccer_health_probe(settings))
        out["soccer_provider"] = "clearsports"
    elif (settings.sportradar_api_key or "").strip():
        out["soccer_provider"] = "sportradar"
    else:
        out["soccer_provider"] = "none"
    out.update(clearsports_us_health_probe(settings))
    if (settings.clearsports_api_key or "").strip():
        out["us_sports_provider"] = "clearsports"
    elif (settings.sportradar_api_key or "").strip():
        out["us_sports_provider"] = "sportradar"
    else:
        out["us_sports_provider"] = "none"
    return out
