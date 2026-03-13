# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Docker Desktop installed and running
- Python 3.11+ (optional if using Docker)
- Node.js 18+ (for mobile app)

### Option 1: Docker Compose (Recommended)

```bash
# 1. Start all services
docker-compose up -d

# 2. Wait for services to be ready (about 10 seconds)
# Check logs: docker-compose logs -f

# 3. Run database migrations
docker-compose exec api alembic upgrade head

# 4. Seed database with sample data
docker-compose exec api python ../scripts/seed_data.py

# 5. Access the API
# API: http://localhost:8000
# API Docs: http://localhost:8000/docs
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

### Option 2: Local Development

```bash
# 1. Start PostgreSQL and Redis
docker-compose up -d postgres redis

# 2. Setup Python environment
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Setup environment variables
cp ../.env.example ../.env
# Edit .env with your settings

# 4. Run migrations
alembic upgrade head

# 5. Seed database
python ../scripts/seed_data.py

# 6. Start API server
uvicorn app.main:app --reload
```

## 📝 Test the API

### 1. Register a User

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'
```

### 2. Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"
```

Save the `access_token` from the response.

### 3. Get Upcoming Games

```bash
curl http://localhost:8000/api/v1/games/upcoming
```

### 4. Get Prediction (requires auth)

```bash
curl http://localhost:8000/api/v1/games/{game_id}/predictions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🧪 Run Tests

```bash
cd backend
pytest

# With coverage
pytest --cov=app --cov-report=html
```

## 📱 Start Mobile App

```bash
cd mobile
npm install
npx expo start

# Scan QR code with Expo Go app
```

**If you see “Unable to run simctl” (exit 72):** Your Mac has Command Line Tools but not full Xcode, so the iOS Simulator isn’t available. You can still run the app by:
- **Web:** In the Expo terminal press `w`, or run `npx expo start --web`
- **Device:** Scan the QR code with the Expo Go app on your phone

To use the iOS Simulator, install [Xcode from the App Store](https://apps.apple.com/app/xcode/id497799835), then run `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` and accept the license.

## 🛠️ Common Commands

```bash
# View logs
docker-compose logs -f api

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Clean everything
docker-compose down -v
```

## ✅ Verify Installation

1. **API Health Check**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status": "healthy", "service": "sports-prediction-api"}`

2. **Database Connection**
   ```bash
   docker-compose exec postgres psql -U postgres -d sportsprediction -c "SELECT COUNT(*) FROM teams;"
   ```
   Should return a number > 0 if seeded

3. **Redis Connection**
   ```bash
   docker-compose exec redis redis-cli ping
   ```
   Should return: `PONG`

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 8000
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Mac/Linux

# Kill process or change port in docker-compose.yml
```

### Database Connection Error
- Check PostgreSQL is running: `docker-compose ps`
- Verify DATABASE_URL in .env matches docker-compose.yml
- Check logs: `docker-compose logs postgres`

### Redis Connection Error
- Check Redis is running: `docker-compose ps`
- Verify REDIS_URL in .env
- Check logs: `docker-compose logs redis`

## 📚 Next Steps

1. Read [DEVELOPER_QUICKSTART.md](./DEVELOPER_QUICKSTART.md) for development workflows
2. Check [API_IMPLEMENTATION.md](./API_IMPLEMENTATION.md) for API details
3. Review [ARCHITECTURE_DESIGN.md](./ARCHITECTURE_DESIGN.md) for system design
4. Explore API docs at http://localhost:8000/docs

## 🎯 What's Built

✅ FastAPI backend with authentication
✅ PostgreSQL database with migrations
✅ Redis caching
✅ Docker Compose setup
✅ Database seeding script
✅ Test suite
✅ API documentation (Swagger/ReDoc)
✅ Monitoring (Prometheus/Grafana)

## 🚧 Coming Soon

- ML model training pipeline
- WebSocket live updates
- Mobile app screens
- Player props predictions
- Advanced analytics
