$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$exe = Join-Path $root 'src-tauri\target\release\samewave-island.exe'
Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $exe } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
$pidFile = Join-Path $root 'evidence\demo-server.pid'
if (Test-Path $pidFile) {
  $serverId = [int](Get-Content $pidFile -Raw).Trim()
  $server = Get-CimInstance Win32_Process -Filter "ProcessId=$serverId" -ErrorAction SilentlyContinue
  if ($server -and $server.Name -eq 'node.exe' -and $server.CommandLine.Contains((Join-Path $root 'server\demo-server.mjs'))) { Stop-Process -Id $serverId }
  Remove-Item $pidFile
}
Write-Host 'Samewave prototype stopped. No other application or Node server was stopped.'
