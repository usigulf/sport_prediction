# PowerShell Development Setup Script for Windows
# This script helps set up the development environment quickly on Windows

Write-Host "🚀 Setting up Sports Prediction Development Environment" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "⚠️  Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}

# Check if Python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Python is not installed. Please install Python 3.11+ and try again." -ForegroundColor Yellow
    exit 1
}

# Step 1: Start Docker services
Write-Host "`nStep 1: Starting Docker services..." -ForegroundColor Green
docker-compose up -d postgres redis

Write-Host "Waiting for services to be ready..."
Start-Sleep -Seconds 10

# Step 2: Setup Python virtual environment
Write-Host "`nStep 2: Setting up Python virtual environment..." -ForegroundColor Green
Set-Location backend

if (-not (Test-Path "venv")) {
    python -m venv venv
}

& .\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing Python dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt

# Step 3: Setup environment variables
Write-Host "`nStep 3: Setting up environment variables..." -ForegroundColor Green
Set-Location ..
if (-not (Test-Path ".env")) {
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env file with your configuration" -ForegroundColor Yellow
} else {
    Write-Host ".env file already exists"
}

# Step 4: Run database migrations
Write-Host "`nStep 4: Running database migrations..." -ForegroundColor Green
Set-Location backend
alembic upgrade head

# Step 5: Seed database (optional)
Write-Host "`nStep 5: Seeding database..." -ForegroundColor Green
$seed = Read-Host "Do you want to seed the database with sample data? (y/n)"
if ($seed -eq "y" -or $seed -eq "Y") {
    python ..\scripts\seed_data.py
}

# Step 6: Setup mobile app (optional)
Write-Host "`nStep 6: Setting up mobile app..." -ForegroundColor Green
$mobile = Read-Host "Do you want to set up the mobile app? (y/n)"
if ($mobile -eq "y" -or $mobile -eq "Y") {
    Set-Location ..\mobile
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing Node.js dependencies..."
        npm install
    } else {
        Write-Host "Node modules already installed"
    }
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Edit .env file with your configuration"
Write-Host "2. Start the backend API: cd backend && .\venv\Scripts\Activate.ps1 && uvicorn app.main:app --reload"
Write-Host "3. Start the mobile app: cd mobile && npx expo start"
Write-Host ""
Write-Host "Services running:"
Write-Host "  - PostgreSQL: localhost:5432"
Write-Host "  - Redis: localhost:6379"
Write-Host "  - API: http://localhost:8000"
Write-Host "  - API Docs: http://localhost:8000/docs"
