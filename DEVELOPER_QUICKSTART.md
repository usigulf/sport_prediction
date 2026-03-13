# Developer Quick Start Guide

## 🎯 Getting Started in 15 Minutes

### 1. Backend API Setup

```bash
# Clone and setup
git clone <repo-url>
cd sport_prediction/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your local database/redis URLs

# Initialize database
alembic upgrade head

# Run migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

API will be available at: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### 2. Database Setup (PostgreSQL + TimescaleDB)

```bash
# Using Docker
docker run -d \
  --name postgres-sports \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=sportsprediction \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg15

# Enable TimescaleDB extension
psql -U postgres -d sportsprediction -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### 3. Redis Setup

```bash
# Using Docker
docker run -d \
  --name redis-sports \
  -p 6379:6379 \
  redis:7-alpine
```

### 4. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start

# Scan QR code with Expo Go app (iOS/Android)
```

## 🔑 Key API Endpoints

### Authentication

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"

# Use token in subsequent requests
export TOKEN="your-access-token-here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/games/upcoming
```

### Games & Predictions

```bash
# Get upcoming games
curl http://localhost:8000/api/v1/games/upcoming?league=nfl

# Get game prediction
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/games/{game_id}/predictions

# Get prediction explanation
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/games/{game_id}/explanation
```

## 🧪 Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_predictions.py

# Run with verbose output
pytest -v
```

## 📁 Project Structure

```
sport_prediction/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API endpoints
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   ├── ml/              # ML inference
│   │   └── core/            # Security, config
│   ├── tests/               # Test files
│   ├── alembic/             # Database migrations
│   └── requirements.txt
│
├── mobile/                  # React Native app
│   ├── src/
│   │   ├── screens/         # App screens
│   │   ├── components/      # Reusable components
│   │   ├── store/           # Redux store
│   │   └── services/        # API clients
│   └── package.json
│
├── ml/                      # ML pipeline
│   ├── training/            # Model training scripts
│   ├── inference/           # Inference code
│   ├── feature_engineering/ # Feature computation
│   └── monitoring/          # Drift detection
│
└── docs/                    # Documentation
```

## 🔧 Common Development Tasks

### Create a New API Endpoint

1. **Define Schema** (`app/schemas/example.py`):
```python
from pydantic import BaseModel

class ExampleResponse(BaseModel):
    id: str
    name: str
```

2. **Create Endpoint** (`app/api/v1/example.py`):
```python
from fastapi import APIRouter
from app.schemas.example import ExampleResponse

router = APIRouter(prefix="/example", tags=["example"])

@router.get("/", response_model=ExampleResponse)
async def get_example():
    return ExampleResponse(id="1", name="Example")
```

3. **Register Router** (`app/api/v1/router.py`):
```python
from app.api.v1.example import router as example_router

api_router.include_router(example_router)
```

### Add a Database Model

1. **Create Model** (`app/models/example.py`):
```python
from sqlalchemy import Column, String
from app.database import Base

class Example(Base):
    __tablename__ = "examples"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
```

2. **Create Migration**:
```bash
alembic revision --autogenerate -m "Add example table"
alembic upgrade head
```

### Add a New Feature

1. **Feature Engineering** (`ml/feature_engineering/new_feature.py`)
2. **Update Training Pipeline** (`ml/training/train_pre_game.py`)
3. **Update Inference** (`ml/inference/pre_game_inference.py`)
4. **Test** (`tests/test_ml_features.py`)

## 🐛 Debugging

### Check Logs

```bash
# Backend logs
tail -f logs/app.log

# Database queries (enable SQL logging)
# Set SQLALCHEMY_ECHO=True in .env
```

### Debug API Issues

1. Check Swagger UI: `http://localhost:8000/docs`
2. Use Postman/Insomnia for API testing
3. Enable debug logging: `LOG_LEVEL=DEBUG`

### Debug ML Models

```python
# Load model from MLflow
import mlflow
model = mlflow.sklearn.load_model("models:/pre_game_ensemble/latest")

# Inspect feature importance
import shap
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)
```

## 📊 Monitoring & Metrics

### Local Prometheus Setup

```bash
# Start Prometheus
docker run -d -p 9090:9090 \
  -v $(pwd)/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Access at http://localhost:9090
```

### View Metrics

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (if running)
- API Metrics: `http://localhost:8000/metrics`

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Secrets stored in secure vault (AWS Secrets Manager/Vault)
- [ ] SSL certificates configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Documentation updated

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [React Native Documentation](https://reactnative.dev/)
- [MLflow Documentation](https://mlflow.org/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

## 🆘 Getting Help

- Check existing documentation in `/docs`
- Review API examples in `API_IMPLEMENTATION.md`
- Check test files for usage examples
- Review architecture decisions in `ARCHITECTURE_DESIGN.md`

## 🔄 Common Workflows

### Daily Development Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes, test locally
pytest
black app/
flake8 app/

# 4. Commit and push
git add .
git commit -m "Add feature X"
git push origin feature/my-feature

# 5. Create PR
```

### Model Training Workflow

```bash
# 1. Prepare data
python ml/training/prepare_data.py

# 2. Train model
python ml/training/train_pre_game.py

# 3. Evaluate
python ml/monitoring/evaluate_model.py

# 4. Register if good
mlflow models register pre_game_ensemble

# 5. Deploy
kubectl set image deployment/ml-inference ml-inference=latest
```

## 💡 Pro Tips

1. **Use Type Hints**: All functions should have type hints for better IDE support
2. **Write Tests First**: TDD helps catch bugs early
3. **Monitor Performance**: Use Prometheus metrics to track API latency
4. **Cache Aggressively**: Redis caching improves response times significantly
5. **Log Everything**: Structured logging helps debug production issues
6. **Version Models**: Always version ML models in MLflow before deploying
