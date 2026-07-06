use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::{Sport, PredictionType};

/// Full game prediction with all bet types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GamePrediction {
    pub game_id: String,
    pub sport: Sport,
    pub home_team: TeamInfo,
    pub away_team: TeamInfo,
    pub game_time: DateTime<Utc>,
    pub predictions: PredictionSet,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub explanation: Option<PredictionExplanation>,
    pub model_version: String,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamInfo {
    pub id: String,
    pub name: String,
    pub abbreviation: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub record: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionSet {
    pub spread: SpreadPrediction,
    pub moneyline: MoneylinePrediction,
    pub total: TotalPrediction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpreadPrediction {
    pub pick: String,        // "home" or "away"
    pub line: f64,           // e.g., -3.5
    pub confidence: f64,     // 0.0 to 1.0
    pub fair_line: f64,      // Model's fair line
    pub edge: f64,           // fair_line - line
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoneylinePrediction {
    pub pick: String,
    pub implied_prob: f64,   // From market odds
    pub fair_prob: f64,      // Model probability
    pub edge: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TotalPrediction {
    pub pick: String,        // "over" or "under"
    pub line: f64,           // e.g., 224.5
    pub confidence: f64,
    pub projected_total: f64,
    pub edge: f64,
}

/// Live in-play prediction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LivePrediction {
    pub game_id: String,
    pub current_score: Score,
    pub game_clock: String,
    pub period: u8,
    pub win_probability: WinProbability,
    pub live_spread: LiveSpread,
    pub momentum: MomentumInfo,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Score {
    pub home: u16,
    pub away: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WinProbability {
    pub home: f64,
    pub away: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveSpread {
    pub current_line: f64,
    pub fair_line: f64,
    pub edge: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MomentumInfo {
    pub score: f64,          // -1.0 to 1.0
    pub direction: String,   // "home" or "away"
    pub recent_events: Vec<String>,
}

/// Player prop prediction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropPrediction {
    pub game_id: String,
    pub player_id: String,
    pub player_name: String,
    pub team: String,
    pub prop_type: String,   // "points", "rebounds", etc.
    pub line: f64,
    pub over_prob: f64,
    pub under_prob: f64,
    pub projected_value: f64,
    pub confidence: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub explanation: Option<PropExplanation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropExplanation {
    pub factors: Vec<ExplanationFactor>,
    pub matchup_notes: String,
}

/// Explanation factor with SHAP-based contribution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplanationFactor {
    pub feature: String,
    pub value: f64,
    pub contribution: f64,   // SHAP value
    pub direction: String,   // "positive" or "negative"
    pub magnitude_pct: f64,
}

/// Full prediction explanation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionExplanation {
    pub top_factors: Vec<ExplanationFactor>,
    pub historical_context: HistoricalContext,
    pub uncertainty: UncertaintyInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoricalContext {
    pub similar_situations_record: String,
    pub model_accuracy_this_spot: f64,
    pub sample_size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UncertaintyInfo {
    pub confidence_interval_95: (f64, f64),
    pub key_swing_factors: Vec<String>,
}

/// Scenario request for what-if analysis
#[derive(Debug, Clone, Deserialize)]
pub struct ScenarioRequest {
    #[serde(default)]
    pub player_status_overrides: std::collections::HashMap<String, String>,
    #[serde(default)]
    pub weight_recent_games: Option<f64>,
    #[serde(default)]
    pub custom_features: std::collections::HashMap<String, f64>,
}

/// Scenario result
#[derive(Debug, Clone, Serialize)]
pub struct ScenarioResult {
    pub original_prediction: GamePrediction,
    pub scenario_prediction: GamePrediction,
    pub delta: PredictionDelta,
    pub sensitivity: Vec<SensitivityFactor>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PredictionDelta {
    pub spread_confidence_change: f64,
    pub win_prob_change: f64,
    pub key_changes: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SensitivityFactor {
    pub factor: String,
    pub impact_per_unit: f64,
}
