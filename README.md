# Sports Prediction AI Platform

A production-ready, AI-powered sports prediction mobile application designed to serve millions of users globally.

## 📋 Documentation

**Architecture (start here):**

- **[PredictIQ_ARCHITECTURE.md](./PredictIQ_ARCHITECTURE.md)** — **Canonical** system architecture (vision, legal, features, ML, backend, mobile, infra, roadmap). Information-only product; no gambling.
- **[ARCHITECTURE_COMPARISON.md](./ARCHITECTURE_COMPARISON.md)** — Side-by-side comparison of all architecture docs and when to use each.
- **[ARCHITECTURE_DESIGN.md](./ARCHITECTURE_DESIGN.md)** — Production design baseline (API, DB, mobile stack).
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Deep technical reference (SportOracle; data pipelines, ML, tier matrix).

**Product & design:**

- **[docs/BETQL_ARCHITECTURE_OCTOBET.md](./docs/BETQL_ARCHITECTURE_OCTOBET.md)** — BetQL architecture 1:1 mapping: sport-first Games (Model Picks | Trending Picks | Player Props), Best Picks, My Picks, no betting.
- **[docs/BETQL_PHILOSOPHY_FOR_OCTOBET.md](./docs/BETQL_PHILOSOPHY_FOR_OCTOBET.md)** — Same core concepts: pick strength (stars), Best Picks, feed structure.

**Implementation & ops:**

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Infrastructure as Code (Terraform), Kubernetes, Docker, CI/CD, monitoring, disaster recovery.
- **[API_IMPLEMENTATION.md](./API_IMPLEMENTATION.md)** — FastAPI implementation: endpoints, services, WebSocket, testing.
- **[ML_PIPELINE.md](./ML_PIPELINE.md)** — ML pipeline: feature engineering, training, inference, SHAP/LIME, drift, model serving.
- **[DEVELOPER_QUICKSTART.md](./DEVELOPER_QUICKSTART.md)** — Developer quick reference, debugging, workflows.

## 🛠️ Additional Resources

- **[docker-compose.yml](./docker-compose.yml)** - Local development environment with PostgreSQL, Redis, ML inference, Prometheus, and Grafana
- **[scripts/seed_data.py](./scripts/seed_data.py)** - Database seeding script with sample teams, games, and predictions
- **[scripts/dev-setup.sh](./scripts/dev-setup.sh)** / **[scripts/dev-setup.ps1](./scripts/dev-setup.ps1)** - Automated development environment setup scripts
- **[.env.example](./.env.example)** - Environment variables template
- **[requirements.txt](./requirements.txt)** - Python dependencies
- **[mobile/src/components/](./mobile/src/components/)** - React Native component examples (PredictionCard, GameCard, ExplanationView)
- **[mobile/src/services/](./mobile/src/services/)** - API and WebSocket service implementations

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+ with TimescaleDB extension (or use Docker)
- Redis 7+ (or use Docker)
- Docker & Docker Compose (recommended for local development)
- Node.js **20+** (for mobile app; Expo SDK 54 requires Node 20+)

### Automated Setup (Recommended)

**Linux/Mac:**
```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\dev-setup.ps1
```

### Manual Setup

**Using Docker Compose (Easiest):**
```bash
# Start all services (PostgreSQL, Redis, API, ML inference, monitoring)
docker-compose up -d

# Seed database with sample data
python scripts/seed_data.py

# API will be available at http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**Backend Setup:**
```bash
# Clone repository
git clone <repo-url>
cd sport_prediction/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp ../.env.example ../.env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Seed database (optional)
python ../scripts/seed_data.py

# Start development server
uvicorn app.main:app --reload
```

**Mobile App Setup:**
```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Scan QR code with Expo Go app (iOS/Android)
```

## 🏗️ Architecture Overview

### Tech Stack

**Backend:**
- FastAPI (Python) - High-performance async API framework
- PostgreSQL + TimescaleDB - Primary database + time-series data
- Redis - Caching and session management
- Apache Kafka - Event streaming for live updates
- MLflow - Model registry and experiment tracking
- TensorFlow Serving - ML model inference

**Mobile:**
- React Native + Expo - Cross-platform mobile framework
- Redux Toolkit - State management
- WebSocket - Real-time updates

**Infrastructure:**
- AWS/GCP - Cloud provider
- Kubernetes - Container orchestration
- Docker - Containerization
- Terraform - Infrastructure as Code
- Prometheus + Grafana - Monitoring

**ML:**
- XGBoost/LightGBM - Gradient boosting models
- TensorFlow/Keras - Neural networks
- SHAP/LIME - Model explainability
- scikit-learn - Traditional ML models

## 📊 Key Features

- **Pre-Game Predictions**: Win probability, score predictions, player props
- **Live In-Play Predictions**: Real-time updates during games
- **Explainable AI**: SHAP values, feature importance, prediction explanations
- **Multi-League Support**: NFL, NBA, MLB, Premier League, Champions League, etc.
- **Freemium Model**: Free tier with premium upgrades
- **B2B API**: White-label solution for partners

## 🔐 Security

- JWT authentication with refresh tokens
- HTTPS/TLS 1.3 enforced
- Rate limiting on all endpoints
- Input validation and sanitization
- GDPR/CCPA compliant
- No gambling integration (information-only)

## 📈 Scalability

- Horizontal scaling via Kubernetes
- Database read replicas
- Redis caching (90%+ hit rate target)
- CDN for static assets
- Auto-scaling based on CPU/memory/queue length

## 🧪 Testing

```bash
# Run tests
pytest tests/

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run linting
flake8 app/
black --check app/
mypy app/
```

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing Guidelines]

## 📧 Contact

[Contact Information]
# sport_prediction
# sport_prediction
