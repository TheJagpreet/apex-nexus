#!/usr/bin/env bash
# Start all 5 apex-nexus services in parallel.
# Press Ctrl+C to stop all.
# Windows users: run scripts/dev.ps1 in PowerShell instead.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

cleanup() {
  echo ""
  echo "Stopping all services..."
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting apex-nexus services..."

(cd services/apex-rag      && .venv/bin/python server.py)              &
(cd services/apex-identity && .venv/bin/python -m apex_identity.main)  &
(cd services/apex-gateway  && .venv/bin/python server.py)              &
(cd services/apex-agents   && .venv/bin/python server.py)              &
(cd apps/apex-portal       && npm run dev)                              &

echo ""
echo "Services starting:"
echo "  apex-rag      -> http://localhost:8000"
echo "  apex-identity -> http://localhost:8001"
echo "  apex-gateway  -> http://localhost:8002"
echo "  apex-agents   -> http://localhost:8003"
echo "  apex-portal   -> http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services."

wait
