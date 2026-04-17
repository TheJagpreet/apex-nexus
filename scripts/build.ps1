# scripts/build.ps1 — Production build of apex-portal (Windows PowerShell).
# Run from the repo root:  .\scripts\build.ps1
# Output: apps/apex-portal/dist/
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Building apex-portal for production..." -ForegroundColor Cyan

Push-Location (Join-Path $RepoRoot 'apps\apex-portal')
try {
    npm run build
    Write-Host ""
    Write-Host "Build complete -> apps/apex-portal/dist/" -ForegroundColor Green
}
finally {
    Pop-Location
}
