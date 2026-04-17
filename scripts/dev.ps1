# scripts/dev.ps1 — Start all 5 apex-nexus services in parallel (Windows PowerShell).
# Run from the repo root:  .\scripts\dev.ps1
# Press Ctrl+C to stop all services.
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot

$services = @(
    @{ Name = 'apex-rag';      Dir = 'services\apex-rag';      Cmd = 'uv run python server.py';               Port = 8000 }
    @{ Name = 'apex-identity'; Dir = 'services\apex-identity'; Cmd = 'uv run python -m apex_identity.main';   Port = 8001 }
    @{ Name = 'apex-gateway';  Dir = 'services\apex-gateway';  Cmd = 'uv run python server.py';               Port = 8002 }
    @{ Name = 'apex-agents';   Dir = 'services\apex-agents';   Cmd = 'uv run python server.py';               Port = 8003 }
    @{ Name = 'apex-portal';   Dir = 'apps\apex-portal';       Cmd = 'npm run dev';                           Port = 5173 }
)

$jobs = @()

Write-Host "Starting apex-nexus services..." -ForegroundColor Cyan
Write-Host ""

foreach ($svc in $services) {
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
