param([switch]$Legacy)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$exe = Join-Path $root 'src-tauri\target\release\samewave-island.exe'
Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -eq $exe } | ForEach-Object { Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue }
$pidName = if ($Legacy) { 'demo-server.pid' } else { 'clinical-demo-server.pid' }
$pidFile = Join-Path $root ('evidence\' + $pidName)
if (Test-Path $pidFile) {
  $serverId = [int](Get-Content $pidFile -Raw).Trim()
  $server = Get-CimInstance Win32_Process -Filter "ProcessId=$serverId" -ErrorAction SilentlyContinue
  $expected = Join-Path $root 'server\demo-server.mjs'
  if ($server -and $server.Name -eq 'node.exe' -and $server.CommandLine -and $server.CommandLine.Contains($expected)) {
    Stop-Process -Id $serverId
    Remove-Item $pidFile
  } elseif (-not $server) { Remove-Item $pidFile }
  else { Write-Warning 'The recorded process could not be verified; it was not stopped.' }
}
Write-Host 'Prototype stop requested. Unrelated processes were not stopped.'
