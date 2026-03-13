#!/bin/bash

# Development Setup Script
# This script helps set up the development environment quickly

set -e

echo "🚀 Setting up Sports Prediction Development Environment"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Python 3 is not installed. Please install Python 3.11+ and try again.${NC}"
    exit 1
fi

# Step 1: Start Docker services
echo -e "\n${GREEN}Step 1: Starting Docker services...${NC}"
docker-compose up -d postgres redis

echo "Waiting for services to be ready..."
sleep 10

# Step 2: Setup Python virtual environment
echo -e "\n${GREEN}Step 2: Setting up Python virtual environment...${NC}"
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Step 3: Setup environment variables
echo -e "\n${GREEN}Step 3: Setting up environment variables...${NC}"
cd ..
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your configuration${NC}"
else
    echo ".env file already exists"
fi

# Step 4: Run database migrations
echo -e "\n${GREEN}Step 4: Running database migrations...${NC}"
cd backend
alembic upgrade head

# Step 5: Seed database (optional)
echo -e "\n${GREEN}Step 5: Seeding database...${NC}"
read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python ../scripts/seed_data.py
fi

# Step 6: Setup mobile app (optional)
echo -e "\n${GREEN}Step 6: Setting up mobile app...${NC}"
read -p "Do you want to set up the mobile app? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd ../mobile
    if [ ! -d "node_modules" ]; then
        echo "Installing Node.js dependencies..."
        npm install
    else
        echo "Node modules already installed"
    fi
fi

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start the backend API: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "3. Start the mobile app: cd mobile && npx expo start"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - API: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
