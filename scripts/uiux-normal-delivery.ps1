$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
Set-Location $root
$exe=Join-Path $root 'src-tauri\target\release\samewave-island.exe'
# Only the verified project executable is stopped; services and other apps are untouched.
Get-CimInstance Win32_Process | Where-Object {$_.ExecutablePath -eq $exe} | ForEach-Object {Stop-Process -Id $_.ProcessId -ErrorAction SilentlyContinue}
Start-Sleep -Seconds 3
$listener=Get-NetTCPConnection -LocalPort 9223 -State Listen -ErrorAction SilentlyContinue
if($listener){throw 'QA port still occupied; no other process was terminated.'}
Invoke-RestMethod 'http://127.0.0.1:17322/api/push' -Method Post -ContentType 'application/json' -Body '{"type":"clinical:reset"}' | Out-Null
$normal=Start-Process -FilePath $exe -WorkingDirectory $root -PassThru
Start-Sleep -Seconds 6
& "$PSScriptRoot\measure-uiux-process.ps1" -RootProcess $normal.Id
$process=Get-CimInstance Win32_Process -Filter "ProcessId=$($normal.Id)"
if(!$process -or $process.ExecutablePath -ne $exe -or $process.CommandLine -match 'qa-cdp|hover-diagnostics'){throw 'Normal launch validation failed'}
Start-Process -FilePath $exe -ArgumentList '--studio' -WorkingDirectory $root | Out-Null
Start-Sleep -Seconds 3
$result=[ordered]@{capturedAt=(Get-Date -Format o);pid=$normal.Id;executable=$process.ExecutablePath;commandLine=$process.CommandLine;sha256=(Get-FileHash $exe -Algorithm SHA256).Hash;qaPortClosed=(-not [bool](Get-NetTCPConnection -LocalPort 9223 -State Listen -ErrorAction SilentlyContinue));studioRequested=$true}
$result | ConvertTo-Json -Depth 4 | Set-Content evidence/uiux-final-20261006/normal-launch.json -Encoding UTF8
$result | ConvertTo-Json -Depth 4
