use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::NaiveDate;
use serde::Deserialize;
use std::sync::Arc;

use crate::error::AppError;
use crate::models::{
    ApiResponse, GamePrediction, LivePrediction, PropPrediction,
    ScenarioRequest, ScenarioResult, Sport,
};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct GamePredictionsQuery {
    pub sport: Option<String>,
    pub date: Option<NaiveDate>,
    pub include_explanations: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PropPredictionsQuery {
    pub game_id: String,
    pub player_id: Option<String>,
    pub prop_type: Option<String>,
}

/// GET /v1/predictions/games
pub async fn get_game_predictions(
    State(state): State<AppState>,
    Query(query): Query<GamePredictionsQuery>,
) -> Result<Json<ApiResponse<Vec<GamePrediction>>>, AppError> {
    let sport = query.sport
        .map(|s| parse_sport(&s))
        .transpose()?;

    let date = query.date.unwrap_or_else(|| chrono::Utc::now().date_naive());
    let include_explanations = query.include_explanations.unwrap_or(false);

    let predictions = state
        .prediction_service
        .get_predictions(sport, date, include_explanations)
        .await?;

    Ok(Json(ApiResponse::new(predictions)))
}

/// GET /v1/predictions/games/:game_id
pub async fn get_game_prediction_detail(
    State(state): State<AppState>,
    Path(game_id): Path<String>,
) -> Result<Json<ApiResponse<GamePrediction>>, AppError> {
    let prediction = state
        .prediction_service
        .get_prediction_detail(&game_id)
        .await?;

    match prediction {
        Some(p) => Ok(Json(ApiResponse::new(p))),
        None => Err(AppError::NotFound(format!("Game {} not found", game_id))),
    }
}

/// GET /v1/predictions/live/:game_id
pub async fn get_live_prediction(
    State(state): State<AppState>,
    Path(game_id): Path<String>,
) -> Result<Json<ApiResponse<LivePrediction>>, AppError> {
    let prediction = state
        .prediction_service
        .get_live_prediction(&game_id)
        .await?;

    match prediction {
        Some(p) => Ok(Json(ApiResponse::new(p))),
        None => Err(AppError::NotFound(format!("Live game {} not found", game_id))),
    }
}

/// GET /v1/predictions/props
pub async fn get_prop_predictions(
    State(state): State<AppState>,
    Query(query): Query<PropPredictionsQuery>,
) -> Result<Json<ApiResponse<Vec<PropPrediction>>>, AppError> {
    let props = state
        .prediction_service
        .get_prop_predictions(
            &query.game_id,
            query.player_id.as_deref(),
            query.prop_type.as_deref(),
        )
        .await?;

    Ok(Json(ApiResponse::new(props)))
}

/// POST /v1/scenarios/:game_id
pub async fn run_scenario(
    State(state): State<AppState>,
    Path(game_id): Path<String>,
    Json(request): Json<ScenarioRequest>,
) -> Result<Json<ApiResponse<ScenarioResult>>, AppError> {
    let result = state
        .prediction_service
        .run_scenario(&game_id, request)
        .await?;

    Ok(Json(ApiResponse::new(result)))
}

fn parse_sport(s: &str) -> Result<Sport, AppError> {
    match s.to_lowercase().as_str() {
        "nba" => Ok(Sport::NBA),
        "nfl" => Ok(Sport::NFL),
        "mlb" => Ok(Sport::MLB),
        "nhl" => Ok(Sport::NHL),
        "ncaab" => Ok(Sport::NCAAB),
        "ncaaf" => Ok(Sport::NCAAF),
        "soccer" => Ok(Sport::Soccer),
        _ => Err(AppError::BadRequest(format!("Unknown sport: {}", s))),
    }
}
