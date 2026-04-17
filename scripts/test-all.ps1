# scripts/test-all.ps1 — Run all pytest suites and report a summary (Windows PowerShell).
# Run from the repo root:  .\scripts\test-all.ps1
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$RepoRoot = Split-Path -Parent $PSScriptRoot

$suites = @(
    @{ Name = 'apex-rag';      Dir = 'services\apex-rag'      }
    @{ Name = 'apex-identity'; Dir = 'services\apex-identity' }
    @{ Name = 'apex-gateway';  Dir = 'services\apex-gateway'  }
    @{ Name = 'apex-agents';   Dir = 'services\apex-agents'   }
)

$pass = @()
$fail = @()

foreach ($suite in $suites) {
    $dir = Join-Path $RepoRoot $suite.Dir
    Write-Host ""
    Write-Host ("━" * 60) -ForegroundColor DarkGray
    Write-Host "  $($suite.Name)" -ForegroundColor Cyan
    Write-Host ("━" * 60) -ForegroundColor DarkGray

    Push-Location $dir
    uv run pytest tests/ -v --tb=short
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
