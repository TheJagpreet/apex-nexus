# scripts/test-all.ps1 — Run pytest suites (Windows PowerShell).
#
# All suites:
#   .\scripts\test-all.ps1
#
# Single suite:
#   .\scripts\test-all.ps1 -Service rag
#   .\scripts\test-all.ps1 -Service identity
#   .\scripts\test-all.ps1 -Service gateway
#   .\scripts\test-all.ps1 -Service agents
#
#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('rag', 'identity', 'gateway', 'agents', '')]
    [string]$Service = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$RepoRoot = Split-Path -Parent $PSScriptRoot

$allSuites = @(
    @{ Name = 'apex-rag';      Key = 'rag';      Dir = 'services\apex-rag'      }
    @{ Name = 'apex-identity'; Key = 'identity'; Dir = 'services\apex-identity' }
    @{ Name = 'apex-gateway';  Key = 'gateway';  Dir = 'services\apex-gateway'  }
    @{ Name = 'apex-agents';   Key = 'agents';   Dir = 'services\apex-agents'   }
)

$targets = if ($Service) {
    $allSuites | Where-Object { $_.Key -eq $Service }
} else {
    $allSuites
}

if (-not $targets) {
    Write-Error "Unknown service '$Service'. Valid values: rag, identity, gateway, agents"
    exit 1
}

$pass = @()
$fail = @()

foreach ($suite in $targets) {
    $dir = Join-Path $RepoRoot $suite.Dir
    Write-Host ""
    Write-Host ("━" * 60) -ForegroundColor DarkGray
    Write-Host "  $($suite.Name)" -ForegroundColor Cyan
    Write-Host ("━" * 60) -ForegroundColor DarkGray

    Push-Location $dir
    & ".venv\Scripts\pytest" tests/ -v --tb=short
    if ($LASTEXITCODE -eq 0) {
        $pass += $suite.Name
    } else {
        $fail += $suite.Name
    }
    Pop-Location
}

Write-Host ""
Write-Host ("━" * 60) -ForegroundColor DarkGray
Write-Host "  SUMMARY" -ForegroundColor White
Write-Host ("━" * 60) -ForegroundColor DarkGray

foreach ($s in $pass) { Write-Host "  PASS  $s" -ForegroundColor Green }
foreach ($s in $fail) { Write-Host "  FAIL  $s" -ForegroundColor Red   }

if ($fail.Count -gt 0) {
    Write-Host ""
    Write-Host "$($fail.Count) suite(s) failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All tests passed." -ForegroundColor Green
