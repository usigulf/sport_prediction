#!/bin/bash
# Seed the database with sample teams, games, predictions, and test users.
# Run from project root: backend/seed.sh   OR from backend: ./seed.sh
set -e
cd "$(dirname "$0")"
source .venv/bin/activate
PYTHONPATH=. python ../scripts/seed_data.py
