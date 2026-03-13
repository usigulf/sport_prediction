-- Initialize database with TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create indexes for better performance
-- (Tables will be created by Alembic migrations, but we can add indexes here)

-- Note: This script runs automatically when PostgreSQL container starts
-- Main schema creation is handled by Alembic migrations
