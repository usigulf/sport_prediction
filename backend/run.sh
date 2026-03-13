#!/bin/bash
# Run the backend. Uses a venv in .venv so you don't need system pip.
set -e
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment (one-time)..."
  python3 -m venv .venv
fi
source .venv/bin/activate

if ! python -c "import uvicorn" 2>/dev/null; then
  echo "Installing dependencies (one-time)..."
  pip install -r requirements.txt
fi

PORT=8000
for p in 8000 8001 8002; do
  if ! lsof -i :$p >/dev/null 2>&1; then
    PORT=$p
    break
  fi
done
if lsof -i :$PORT >/dev/null 2>&1; then
  echo "Ports 8000, 8001, 8002 are in use. Free one with: kill \$(lsof -t -i :8000)"
  exit 1
fi
if [ "$PORT" != "8000" ]; then
  echo "Port 8000 in use, using $PORT. If using the app, set EXPO_PUBLIC_API_URL=http://localhost:$PORT/api/v1"
fi
echo "Starting backend at http://localhost:$PORT (use your machine's LAN IP for app on device, e.g. http://192.168.x.x:$PORT/api/v1)"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port "$PORT"
