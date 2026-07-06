use anyhow::Result;
use config::{Config, Environment, File};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub environment: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub triton_url: String,
    pub feature_store_url: String,
    pub kafka_brokers: String,
}

impl Settings {
    pub fn new() -> Result<Self> {
        let environment = std::env::var("ENV").unwrap_or_else(|_| "development".into());

        let config = Config::builder()
            // Start with default values
            .set_default("environment", environment.clone())?
            .set_default("port", 3002)?
            .set_default("redis_url", "redis://localhost:6379")?
            .set_default("triton_url", "http://localhost:8001")?
            .set_default("feature_store_url", "http://localhost:6566")?
            .set_default("kafka_brokers", "localhost:9092")?
            // Load environment-specific config file if exists
            .add_source(File::with_name(&format!("config/{}", environment)).required(false))
            // Override with environment variables (prefixed with APP_)
            .add_source(
                Environment::with_prefix("APP")
                    .separator("__")
                    .try_parsing(true),
            )
            // Override with direct environment variables
            .add_source(Environment::default())
            .build()?;

        Ok(config.try_deserialize()?)
    }
}
