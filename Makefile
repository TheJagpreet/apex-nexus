# Apex Nexus — Makefile
# Cross-platform (Linux / macOS / Windows via Git Bash or WSL).
# Prerequisites: uv >= 0.4, node 20+, ollama
#
# Windows native PowerShell users: use scripts/setup.ps1 / dev.ps1 / test-all.ps1

.PHONY: help setup setup-rag setup-identity setup-gateway setup-agents setup-portal \
        dev dev-rag dev-identity dev-gateway dev-agents dev-portal \
        test test-rag test-identity test-gateway test-agents \
        lint lint-identity lint-gateway lint-agents \
        build clean

# ─── Default ─────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  Apex Nexus — available targets"
	@echo ""
	@echo "  Setup"
	@echo "    setup             Install deps for all services"
	@echo "    setup-rag         Install apex-rag deps (Python 3.10)"
	@echo "    setup-identity    Install apex-identity deps (Python 3.11)"
	@echo "    setup-gateway     Install apex-gateway deps (Python 3.11)"
	@echo "    setup-agents      Install apex-agents deps (Python 3.11)"
	@echo "    setup-portal      Install apex-portal deps (npm)"
	@echo ""
	@echo "  Development"
	@echo "    dev               Start all 5 services (parallel, Unix/Git Bash)"
	@echo "    dev-rag           Start apex-rag          :8000"
	@echo "    dev-identity      Start apex-identity     :8001"
	@echo "    dev-gateway       Start apex-gateway      :8002"
	@echo "    dev-agents        Start apex-agents       :8003"
	@echo "    dev-portal        Start apex-portal       :5173"
	@echo ""
	@echo "  Testing"
	@echo "    test              Run all test suites"
	@echo "    test-rag          Run apex-rag tests"
	@echo "    test-identity     Run apex-identity tests"
	@echo "    test-gateway      Run apex-gateway tests"
	@echo "    test-agents       Run apex-agents tests"
	@echo ""
	@echo "  Quality"
	@echo "    lint              ruff + mypy on apex-identity, apex-gateway, apex-agents"
	@echo "    lint-identity     ruff + mypy on apex-identity"
	@echo "    lint-gateway      ruff + mypy on apex-gateway"
	@echo "    lint-agents       ruff + mypy on apex-agents"
	@echo ""
	@echo "  Other"
	@echo "    build             Build apex-portal for production"
	@echo "    clean             Remove venvs, build artefacts, caches"
	@echo ""
	@echo "  Windows (PowerShell) equivalents:"
	@echo "    scripts/setup.ps1   scripts/dev.ps1   scripts/test-all.ps1"
	@echo ""

# ─── Setup ───────────────────────────────────────────────────────────────────

setup: setup-rag setup-identity setup-gateway setup-agents setup-portal

setup-rag:
	cd services/apex-rag && uv venv .venv --python 3.10 && uv pip install -e ".[dev,server]"

setup-identity:
	cd services/apex-identity && uv venv .venv --python 3.11 && uv pip install -e ".[dev]"

setup-gateway:
	cd services/apex-gateway && uv venv .venv --python 3.11 && uv pip install -e ".[dev]"

setup-agents:
	cd services/apex-agents && uv venv .venv --python 3.11 && uv pip install -e ".[dev]"

setup-portal:
	cd apps/apex-portal && npm install

# ─── Development ─────────────────────────────────────────────────────────────
# `make dev` requires a Unix-like shell (bash, Git Bash, WSL).
# On Windows PowerShell run: .\scripts\dev.ps1

dev:
	@echo "Starting all services in parallel..."
	@$(MAKE) dev-rag & \
	$(MAKE) dev-identity & \
	$(MAKE) dev-gateway & \
	$(MAKE) dev-agents & \
	$(MAKE) dev-portal & \
	wait

dev-rag:
	cd services/apex-rag && uv run python server.py

dev-identity:
	cd services/apex-identity && uv run python -m apex_identity.main

dev-gateway:
	cd services/apex-gateway && uv run python server.py

dev-agents:
	cd services/apex-agents && uv run python server.py

dev-portal:
	cd apps/apex-portal && npm run dev

# ─── Testing ─────────────────────────────────────────────────────────────────

test: test-rag test-identity test-gateway test-agents

test-rag:
	cd services/apex-rag && uv run pytest tests/ -v --tb=short

test-identity:
	cd services/apex-identity && uv run pytest tests/ -v --tb=short

test-gateway:
	cd services/apex-gateway && uv run pytest tests/ -v --tb=short

test-agents:
	cd services/apex-agents && uv run pytest tests/ -v --tb=short

# ─── Quality ─────────────────────────────────────────────────────────────────

lint: lint-identity lint-gateway lint-agents

lint-identity:
	cd services/apex-identity && uv run ruff check src/ && uv run mypy src/

lint-gateway:
	cd services/apex-gateway && uv run ruff check src/ && uv run mypy src/

lint-agents:
	cd services/apex-agents && uv run ruff check src/ && uv run mypy src/

# ─── Build ───────────────────────────────────────────────────────────────────

build:
	cd apps/apex-portal && npm run build

# ─── Clean ───────────────────────────────────────────────────────────────────
# Uses Python for the recursive cache-deletion so it works on Windows too.

clean:
	-rm -rf services/apex-rag/.venv
	-rm -rf services/apex-identity/.venv
	-rm -rf services/apex-gateway/.venv
	-rm -rf services/apex-agents/.venv
	-rm -rf apps/apex-portal/node_modules
	-rm -rf apps/apex-portal/dist
	python -c "import shutil, pathlib; [shutil.rmtree(p) for p in pathlib.Path('.').rglob('__pycache__') if '.venv' not in str(p) and 'node_modules' not in str(p)]"
	python -c "import shutil, pathlib; [shutil.rmtree(p) for p in pathlib.Path('.').rglob('*.egg-info') if '.venv' not in str(p)]"
	python -c "import pathlib; [p.unlink() for p in pathlib.Path('.').rglob('*.pyc') if '.venv' not in str(p)]"
