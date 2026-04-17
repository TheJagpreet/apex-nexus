# scripts/clean.ps1 — Remove venvs, node_modules, build artefacts, and caches (Windows PowerShell).
# Run from the repo root:  .\scripts\clean.ps1
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$RepoRoot = Split-Path -Parent $PSScriptRoot

function Remove-Dir([string]$rel) {
    $full = Join-Path $RepoRoot $rel
    if (Test-Path $full) {
        Write-Host "  removing $rel" -ForegroundColor DarkGray
        Remove-Item -Recurse -Force $full
    }
}

Write-Host "Cleaning apex-nexus..." -ForegroundColor Cyan
Write-Host ""

# Virtual environments
Remove-Dir 'services\apex-rag\.venv'
Remove-Dir 'services\apex-identity\.venv'
Remove-Dir 'services\apex-gateway\.venv'
Remove-Dir 'services\apex-agents\.venv'

# Node
Remove-Dir 'apps\apex-portal\node_modules'
Remove-Dir 'apps\apex-portal\dist'

# Python caches — skip .venv and node_modules subtrees
Write-Host "  removing __pycache__ dirs..." -ForegroundColor DarkGray
Get-ChildItem -Path $RepoRoot -Filter '__pycache__' -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\\.venv\\' -and $_.FullName -notmatch '\\node_modules\\' } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "  removing *.egg-info dirs..." -ForegroundColor DarkGray
Get-ChildItem -Path $RepoRoot -Filter '*.egg-info' -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\\.venv\\' } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "  removing *.pyc files..." -ForegroundColor DarkGray
Get-ChildItem -Path $RepoRoot -Filter '*.pyc' -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\\.venv\\' } |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "  removing .pytest_cache dirs..." -ForegroundColor DarkGray
Get-ChildItem -Path $RepoRoot -Filter '.pytest_cache' -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\\.venv\\' } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Clean complete." -ForegroundColor Green
