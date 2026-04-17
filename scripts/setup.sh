#!/usr/bin/env bash
# Install all dependencies for all apex-nexus services.
# Windows users: run scripts/setup.ps1 in PowerShell instead.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> apex-rag: installing (Python 3.11)"
cd services/apex-rag
uv venv .venv --python 3.11
uv pip install -e ".[dev,server]"
cd "$REPO_ROOT"

echo "==> apex-identity: installing (Python 3.11)"
cd services/apex-identity
uv venv .venv --python 3.11
uv pip install -e ".[dev]"
cd "$REPO_ROOT"

echo "==> apex-gateway: installing (Python 3.11)"
cd services/apex-gateway
uv venv .venv --python 3.11
uv pip install -e ".[dev]"
cd "$REPO_ROOT"

echo "==> apex-agents: installing (Python 3.11)"
cd services/apex-agents
uv venv .venv --python 3.11
uv pip install -e ".[dev]"
cd "$REPO_ROOT"

echo "==> apex-portal: npm install"
cd apps/apex-portal
npm install
cd "$REPO_ROOT"

echo ""
echo "All services installed."
echo "Next: copy .env.example -> .env in each service directory, then run: make dev"
