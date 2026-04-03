#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/psicoapp_backend"

cleanup() {
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting backend with Docker Compose..."
(cd "$BACKEND_DIR" && docker compose up --build) &
BACKEND_PID=$!

echo "Starting Expo frontend..."
cd "$ROOT_DIR"
npm start

wait "$BACKEND_PID"
