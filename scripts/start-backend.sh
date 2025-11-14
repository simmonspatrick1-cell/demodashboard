#!/usr/bin/env bash
set -e

# Load .env if present
if [ -f ".env" ]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

export NETSUITE_ACCOUNT_ID="${NETSUITE_ACCOUNT_ID:-td3049589}"
export PORT="${PORT:-3004}"

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "ANTHROPIC_API_KEY is not set. Export it first or add it to .env."
  exit 1
fi

echo "Starting backend on port $PORT…"
npm start
