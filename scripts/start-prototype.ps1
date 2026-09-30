$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$exe = Join-Path $root 'src-tauri\target\release\samewave-island.exe'
if (-not (Test-Path $exe)) { throw 'Native binary not built. Run npm run desktop:build first.' }
New-Item -ItemType Directory -Force "$root\evidence" | Out-Null
$healthy = $false
try { $h = Invoke-RestMethod 'http://127.0.0.1:17321/api/health' -TimeoutSec 2; $healthy = $h.name -eq 'samewave-synthetic-demo' } catch {}
if (-not $healthy) {
  if (Get-NetTCPConnection -LocalPort 17321 -State Listen -ErrorAction SilentlyContinue) { throw 'Port 17321 is occupied by another application.' }
  $server = Start-Process node -ArgumentList ('"' + $root + '\server\demo-server.mjs"') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput "$root\evidence\demo-server.log" -RedirectStandardError "$root\evidence\demo-server-error.log"
  $server.Id | Set-Content "$root\evidence\demo-server.pid"
}
Start-Process $exe -ArgumentList '--studio' -WorkingDirectory $root
