# scripts/lint.ps1 — ruff + mypy on Python services (Windows PowerShell).
#
# All services:
#   .\scripts\lint.ps1
#
# Single service:
#   .\scripts\lint.ps1 -Service identity
#   .\scripts\lint.ps1 -Service gateway
#   .\scripts\lint.ps1 -Service agents
#
#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('identity', 'gateway', 'agents', '')]
    [string]$Service = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$RepoRoot = Split-Path -Parent $PSScriptRoot

$allServices = @(
    @{ Name = 'apex-identity'; Key = 'identity'; Dir = 'services\apex-identity' }
    @{ Name = 'apex-gateway';  Key = 'gateway';  Dir = 'services\apex-gateway'  }
    @{ Name = 'apex-agents';   Key = 'agents';   Dir = 'services\apex-agents'   }
)

$targets = if ($Service) {
    $allServices | Where-Object { $_.Key -eq $Service }
} else {
    $allServices
}

if (-not $targets) {
    Write-Error "Unknown service '$Service'. Valid values: identity, gateway, agents"
    exit 1
}

$pass = @()
$fail = @()

foreach ($svc in $targets) {
    $dir = Join-Path $RepoRoot $svc.Dir
    Write-Host ""
    Write-Host ("━" * 60) -ForegroundColor DarkGray
    Write-Host "  $($svc.Name)" -ForegroundColor Cyan
    Write-Host ("━" * 60) -ForegroundColor DarkGray

    Push-Location $dir
    $ok = $true

    Write-Host "  ruff check src/" -ForegroundColor DarkGray
    uv run --no-sync ruff check src/
    if ($LASTEXITCODE -ne 0) { $ok = $false }

    Write-Host "  mypy src/" -ForegroundColor DarkGray
    uv run --no-sync mypy src/
    if ($LASTEXITCODE -ne 0) { $ok = $false }

    Pop-Location

    if ($ok) { $pass += $svc.Name } else { $fail += $svc.Name }
}

Write-Host ""
Write-Host ("━" * 60) -ForegroundColor DarkGray
Write-Host "  SUMMARY" -ForegroundColor White
Write-Host ("━" * 60) -ForegroundColor DarkGray

foreach ($s in $pass) { Write-Host "  PASS  $s" -ForegroundColor Green }
foreach ($s in $fail) { Write-Host "  FAIL  $s" -ForegroundColor Red   }

if ($fail.Count -gt 0) {
    Write-Host ""
    Write-Host "$($fail.Count) service(s) failed lint." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All lint checks passed." -ForegroundColor Green
