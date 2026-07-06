use axum::{http::StatusCode, Json};
use serde::Serialize;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
    pub time: String,
}

#[derive(Serialize)]
pub struct ReadyResponse {
    pub status: String,
    pub checks: std::collections::HashMap<String, String>,
    pub time: String,
}

pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "predictions".to_string(),
        time: chrono::Utc::now().to_rfc3339(),
    })
}

pub async fn ready() -> (StatusCode, Json<ReadyResponse>) {
    // In a real implementation, we'd check database, Redis, etc.
    let mut checks = std::collections::HashMap::new();
    checks.insert("database".to_string(), "healthy".to_string());
    checks.insert("redis".to_string(), "healthy".to_string());
    checks.insert("feature_store".to_string(), "healthy".to_string());
    checks.insert("model_server".to_string(), "healthy".to_string());

    (
        StatusCode::OK,
        Json(ReadyResponse {
            status: "ready".to_string(),
            checks,
            time: chrono::Utc::now().to_rfc3339(),
        }),
    )
}
