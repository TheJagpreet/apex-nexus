# scripts/setup.ps1 — Install all dependencies for all apex-nexus services.
# Run from the repo root:  .\scripts\setup.ps1
# Requires: uv >= 0.4, node 20+
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

function Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

try {
    Step "apex-rag: installing (Python 3.10)"
    Push-Location services\apex-rag
    uv venv .venv --python 3.10
    uv pip install -e ".[dev,server]"
    Pop-Location

    Step "apex-identity: installing (Python 3.11)"
    Push-Location services\apex-identity
    uv venv .venv --python 3.11
    uv pip install -e ".[dev]"
    Pop-Location

    Step "apex-gateway: installing (Python 3.11)"
    Push-Location services\apex-gateway
    uv venv .venv --python 3.11
    uv pip install -e ".[dev]"
    Pop-Location

    Step "apex-agents: installing (Python 3.11)"
    Push-Location services\apex-agents
    uv venv .venv --python 3.11
    uv pip install -e ".[dev]"
    Pop-Location

    Step "apex-portal: npm install"
    Push-Location apps\apex-portal
    npm install
    Pop-Location

    Write-Host "`nAll services installed." -ForegroundColor Green
    Write-Host "Next: copy .env.example -> .env in each service directory, then run: .\scripts\dev.ps1"
}
finally {
    Pop-Location
}
