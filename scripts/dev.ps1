# scripts/dev.ps1 — Start apex-nexus services (Windows PowerShell).
#
# All services (each in its own window):
#   .\scripts\dev.ps1
#
# Single service (inline in current terminal):
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
    @{ Name = 'apex-rag';      Key = 'rag';      Dir = 'services\apex-rag';      Cmd = '.venv\Scripts\python server.py';             Port = 8000 }
    @{ Name = 'apex-identity'; Key = 'identity'; Dir = 'services\apex-identity'; Cmd = '.venv\Scripts\python -m apex_identity.main'; Port = 8001 }
    @{ Name = 'apex-gateway';  Key = 'gateway';  Dir = 'services\apex-gateway';  Cmd = '.venv\Scripts\python server.py';             Port = 8002 }
    @{ Name = 'apex-agents';   Key = 'agents';   Dir = 'services\apex-agents';   Cmd = '.venv\Scripts\python server.py';             Port = 8003 }
    @{ Name = 'apex-portal';   Key = 'portal';   Dir = 'apps\apex-portal';       Cmd = 'npm run dev';                               Port = 5173 }
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

# ── Single service: run inline so output streams directly to this terminal ──
if (@($targets).Count -eq 1) {
    $svc = $targets[0]
    Write-Host "Starting $($svc.Name) -> http://localhost:$($svc.Port)" -ForegroundColor Cyan
    Push-Location (Join-Path $RepoRoot $svc.Dir)
    try { Invoke-Expression $svc.Cmd }
    finally { Pop-Location }
    exit
}

# ── Multiple services: each gets its own PowerShell window ──────────────────
Write-Host "Starting apex-nexus services (one window per service)..." -ForegroundColor Cyan
Write-Host ""

foreach ($svc in $targets) {
    $dir  = Join-Path $RepoRoot $svc.Dir
    $expr = "& { `$host.UI.RawUI.WindowTitle = '$($svc.Name)'; Set-Location '$dir'; $($svc.Cmd) }"
    Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $expr
    Write-Host "  $($svc.Name.PadRight(15)) -> http://localhost:$($svc.Port)  [new window]"
}

Write-Host ""
Write-Host "All services launched. Close each window to stop that service." -ForegroundColor Green
