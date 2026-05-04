#!/bin/bash
# Start PFMS locally without Docker (requires PostgreSQL running)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== PFMS Local Development Setup ==="

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "Error: PostgreSQL is not installed."
  echo "Install it from: https://www.postgresql.org/download/"
  exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed."
  echo "Install it from: https://nodejs.org/"
  exit 1
fi

# Create .env if it doesn't exist
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
  echo "Created .env from .env.example — edit it with your API keys"
fi

# Set up database
echo ""
echo "Setting up database..."
read -p "Create pfms database and user? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  psql -U postgres -c "CREATE USER pfms WITH PASSWORD 'pfms_password';" 2>/dev/null || true
  psql -U postgres -c "CREATE DATABASE pfms OWNER pfms;" 2>/dev/null || true
  psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE pfms TO pfms;" 2>/dev/null || true
  echo "Database 'pfms' created."
fi

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install

# Build backend
echo "Building backend..."
npm run build

# Start backend in background
echo "Starting backend on port 5000..."
DATABASE_URL="postgresql://pfms:pfms_password@localhost:5432/pfms" \
  $(cd "$SCRIPT_DIR" && source .env 2>/dev/null; echo "DATABASE_URL=postgresql://pfms:pfms_password@localhost:5432/pfms") \
  node dist/server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install

# Build frontend
echo "Building frontend..."
npm run build

echo ""
echo "=== PFMS is running! ==="
echo "Backend:  http://localhost:5000"
echo "Frontend: Run 'npm run dev' in frontend/ for dev server, or serve dist/ with any static server"
echo ""
echo "To start the frontend dev server:"
echo "  cd frontend && npm run dev"
echo ""
echo "Press Ctrl+C to stop the backend"
wait $BACKEND_PID
