.PHONY: help install test lint format clean docker-up docker-down seed migrate

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation
install: ## Install all dependencies
	cd backend && pip install -r requirements.txt
	cd mobile && npm install

install-dev: ## Install development dependencies
	cd backend && pip install -r requirements.txt -r requirements-dev.txt

# Testing
test: ## Run all tests
	cd backend && pytest

test-cov: ## Run tests with coverage
	cd backend && pytest --cov=app --cov-report=html --cov-report=term

test-watch: ## Run tests in watch mode
	cd backend && pytest-watch

# Code Quality
lint: ## Run linters
	cd backend && flake8 app/ --max-line-length=100
	cd backend && mypy app/ --ignore-missing-imports || true

format: ## Format code
	cd backend && black app/ tests/
	cd backend && isort app/ tests/

format-check: ## Check code formatting
	cd backend && black --check app/ tests/
	cd backend && isort --check-only app/ tests/

# Database
migrate: ## Run database migrations
	cd backend && alembic upgrade head

migrate-create: ## Create new migration (use MESSAGE="description")
	cd backend && alembic revision --autogenerate -m "$(MESSAGE)"

seed: ## Seed database with sample data (run from backend so app is importable)
	cd backend && source .venv/bin/activate && PYTHONPATH=. python ../scripts/seed_data.py

# Docker
docker-up: ## Start all Docker services
	docker-compose up -d

docker-down: ## Stop all Docker services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-build: ## Build Docker images
	docker-compose build

docker-clean: ## Remove all containers and volumes
	docker-compose down -v

# Development
dev-backend: ## Start backend development server
	cd backend && uvicorn app.main:app --reload

dev-mobile: ## Start mobile app development server
	cd mobile && npx expo start

dev-all: docker-up dev-backend ## Start all development services

# Cleanup
clean: ## Clean Python cache and build files
	find . -type d -name __pycache__ -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -r {} +
	rm -rf backend/.pytest_cache
	rm -rf backend/htmlcov
	rm -rf backend/.coverage

clean-all: clean docker-clean ## Clean everything including Docker

# ML
ml-train: ## Train ML models
	cd ml/training && python train_pre_game.py

ml-evaluate: ## Evaluate ML models
	cd ml/monitoring && python evaluate_models.py

# Monitoring
monitor: docker-up ## Start monitoring services
	@echo "Prometheus: http://localhost:9090"
	@echo "Grafana: http://localhost:3000 (admin/admin)"

# CI/CD
ci-test: lint format-check test ## Run all CI checks

# Production
prod-build: ## Build production Docker images
	docker build -t sport-prediction-api:latest ./backend

prod-deploy: ## Deploy to production (requires kubeconfig)
	kubectl apply -f k8s/

# Utilities
check-env: ## Check environment variables
	@test -f .env || (echo "Error: .env file not found. Copy .env.example to .env" && exit 1)

setup: check-env install docker-up migrate seed ## Complete setup (install, start services, migrate, seed)
