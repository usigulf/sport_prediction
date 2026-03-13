use anyhow::Result;
use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod error;
mod handlers;
mod models;
mod repository;
mod services;

use config::Settings;
use repository::{FeatureStore, PredictionCache, PredictionRepository};
use services::{ModelClient, PredictionService};

#[derive(Clone)]
pub struct AppState {
    pub prediction_service: Arc<PredictionService>,
    pub settings: Arc<Settings>,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let settings = Arc::new(Settings::new()?);
    info!("Loaded configuration for environment: {}", settings.environment);

    // Initialize database connection
    let db_pool = repository::create_pool(&settings.database_url).await?;
    info!("Connected to database");

    // Initialize Redis cache
    let redis = PredictionCache::new(&settings.redis_url).await?;
    info!("Connected to Redis");

    // Initialize feature store client
    let feature_store = FeatureStore::new(&settings.feature_store_url);

    // Initialize ML model client
    let model_client = ModelClient::new(&settings.triton_url);

    // Initialize repositories and services
    let prediction_repo = PredictionRepository::new(db_pool.clone());
    let prediction_service = Arc::new(PredictionService::new(
        prediction_repo,
        redis,
        feature_store,
        model_client,
    ));

    // Build application state
    let state = AppState {
        prediction_service,
        settings: settings.clone(),
    };

    // Build router
    let app = Router::new()
        // Health routes
        .route("/health", get(handlers::health::health))
        .route("/ready", get(handlers::health::ready))
        // Prediction routes
        .route("/v1/predictions/games", get(handlers::predictions::get_game_predictions))
        .route("/v1/predictions/games/:game_id", get(handlers::predictions::get_game_prediction_detail))
        .route("/v1/predictions/live/:game_id", get(handlers::predictions::get_live_prediction))
        .route("/v1/predictions/props", get(handlers::predictions::get_prop_predictions))
        .route("/v1/scenarios/:game_id", post(handlers::predictions::run_scenario))
        // Accuracy routes
        .route("/v1/accuracy", get(handlers::accuracy::get_accuracy_stats))
        .route("/v1/accuracy/calibration", get(handlers::accuracy::get_calibration))
        // Middleware
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], settings.port));
    info!("Starting Predictions Service on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
