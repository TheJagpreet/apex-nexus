# scripts/dev.ps1 — Start apex-nexus services (Windows PowerShell).
#
# All services (parallel):
#   .\scripts\dev.ps1
#
# Single service:
#   .\scripts\dev.ps1 -Service rag
#   .\scripts\dev.ps1 -Service identity
#   .\scripts\dev.ps1 -Service gateway
#   .\scripts\dev.ps1 -Service agents
#   .\scripts\dev.ps1 -Service portal
#
#Requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateSet('rag', 'identity', 'gateway', 'agents', 'portal', '')]
    [string]$Service = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot

$allServices = @(
    @{ Name = 'apex-rag';      Key = 'rag';      Dir = 'services\apex-rag';      Cmd = 'uv run python server.py';               Port = 8000 }
    @{ Name = 'apex-identity'; Key = 'identity'; Dir = 'services\apex-identity'; Cmd = 'uv run python -m apex_identity.main';   Port = 8001 }
    @{ Name = 'apex-gateway';  Key = 'gateway';  Dir = 'services\apex-gateway';  Cmd = 'uv run python server.py';               Port = 8002 }
    @{ Name = 'apex-agents';   Key = 'agents';   Dir = 'services\apex-agents';   Cmd = 'uv run python server.py';               Port = 8003 }
    @{ Name = 'apex-portal';   Key = 'portal';   Dir = 'apps\apex-portal';       Cmd = 'npm run dev';                           Port = 5173 }
)

$targets = if ($Service) {
    $allServices | Where-Object { $_.Key -eq $Service }
} else {
    $allServices
}

if (-not $targets) {
    Write-Error "Unknown service '$Service'. Valid values: rag, identity, gateway, agents, portal"
    exit 1
}

# ── Single service: run inline (no job overhead, output goes straight to console) ──
if ($targets.Count -eq 1) {
    $svc = $targets[0]
    Write-Host "Starting $($svc.Name) on http://localhost:$($svc.Port) ..." -ForegroundColor Cyan
    Push-Location (Join-Path $RepoRoot $svc.Dir)
    try { Invoke-Expression $svc.Cmd }
    finally { Pop-Location }
    exit
}

# ── Multiple services: run as background jobs ────────────────────────────────
$jobs = @()

Write-Host "Starting apex-nexus services..." -ForegroundColor Cyan
Write-Host ""

foreach ($svc in $targets) {
    $dir = Join-Path $RepoRoot $svc.Dir
    $job = Start-Job -Name $svc.Name -ScriptBlock {
        param($d, $c)
        Set-Location $d
        Invoke-Expression $c
    } -ArgumentList $dir, $svc.Cmd
    $jobs += $job
    Write-Host "  $($svc.Name.PadRight(15)) -> http://localhost:$($svc.Port)"
}

Write-Host ""
Write-Host "All services started. Press Ctrl+C to stop." -ForegroundColor Green
Write-Host ""

try {
    while ($true) {
        foreach ($job in $jobs) {
            $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
            if ($output) { Write-Host "[$($job.Name)] $output" }
        }
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "`nStopping all services..." -ForegroundColor Yellow
    $jobs | Stop-Job
    $jobs | Remove-Job -Force
}
