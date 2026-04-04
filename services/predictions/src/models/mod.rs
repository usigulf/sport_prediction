use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub mod prediction;
pub mod game;
pub mod explanation;

pub use prediction::*;
pub use game::*;
pub use explanation::*;

/// Sports supported by the platform
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Sport {
    NBA,
    NFL,
    MLB,
    NHL,
    NCAAB,
    NCAAF,
    Soccer,
}

impl Sport {
    pub fn as_str(&self) -> &'static str {
        match self {
            Sport::NBA => "nba",
            Sport::NFL => "nfl",
            Sport::MLB => "mlb",
            Sport::NHL => "nhl",
            Sport::NCAAB => "ncaab",
            Sport::NCAAF => "ncaaf",
            Sport::Soccer => "soccer",
        }
    }
}

/// Types of predictions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PredictionType {
    Spread,
    Moneyline,
    Total,
    Prop,
}

/// Common API response wrapper
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub data: T,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<ResponseMeta>,
}

#[derive(Debug, Serialize)]
pub struct ResponseMeta {
    pub total: Option<u32>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub generated_at: DateTime<Utc>,
}

impl<T> ApiResponse<T> {
    pub fn new(data: T) -> Self {
        Self { data, meta: None }
    }

    pub fn with_meta(data: T, meta: ResponseMeta) -> Self {
        Self { data, meta: Some(meta) }
    }
}
