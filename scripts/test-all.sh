#!/usr/bin/env bash
# Run all pytest suites and report a summary.
# Windows users: run scripts/test-all.ps1 in PowerShell instead.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PASS=()
FAIL=()

run_tests() {
  local name=$1
  local dir=$2
  local cmd=$3

  echo ""
  echo "━━━ $name ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if (cd "$dir" && eval "$cmd"); then
    PASS+=("$name")
  else
    FAIL+=("$name")
  fi
}

run_tests "apex-rag"      "services/apex-rag"      "uv run pytest tests/ -v --tb=short"
run_tests "apex-identity" "services/apex-identity" "uv run pytest tests/ -v --tb=short"
run_tests "apex-gateway"  "services/apex-gateway"  "uv run pytest tests/ -v --tb=short"
run_tests "apex-agents"   "services/apex-agents"   "uv run pytest tests/ -v --tb=short"

echo ""
echo "━━━ SUMMARY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for s in "${PASS[@]}"; do echo "  PASS  $s"; done
for s in "${FAIL[@]}"; do echo "  FAIL  $s"; done

if [ ${#FAIL[@]} -gt 0 ]; then
  exit 1
fi
echo ""
echo "All tests passed."
