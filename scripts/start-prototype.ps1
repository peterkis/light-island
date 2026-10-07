param([switch]$Legacy)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$exe = Join-Path $root 'src-tauri\target\release\samewave-island.exe'
if (-not (Test-Path $exe)) { throw 'Run npm run desktop:build first.' }
$port = if ($Legacy) { 17321 } else { 17322 }
$pidName = if ($Legacy) { 'demo-server.pid' } else { 'clinical-demo-server.pid' }
New-Item -ItemType Directory -Force "$root\evidence" | Out-Null
$healthy = $false
try {
  $health = Invoke-RestMethod "http://127.0.0.1:$port/api/health" -TimeoutSec 2
  $healthy = $health.name -eq 'samewave-synthetic-demo'
  if (-not $Legacy) { $snapshot = Invoke-RestMethod "http://127.0.0.1:$port/api/clinical-state" -TimeoutSec 2; $healthy = $healthy -and $snapshot.type -eq 'clinical:snapshot' }
} catch { $healthy = $false }
if (-not $healthy) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Port $port is occupied; no process was stopped." }
  $previousPort = $env:ISLAND_DEMO_PORT
  try {
    $env:ISLAND_DEMO_PORT = [string]$port
    $server = Start-Process node -ArgumentList ('"'+$root+'\server\demo-server.mjs"') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput "$root\evidence\demo-$port.log" -RedirectStandardError "$root\evidence\demo-$port-error.log"
    $server.Id | Set-Content "$root\evidence\$pidName"
  } finally { $env:ISLAND_DEMO_PORT = $previousPort }
}
$arguments = if ($Legacy) { '--legacy --studio' } else { '--studio' }
Start-Process $exe -ArgumentList $arguments -WorkingDirectory $root
