# Start the exact tested EXE for normal review after the owned QA is closed.
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$out=Join-Path $taskRoot 'evidence\uiux-refinement-20261013'
$exe=Join-Path $taskRoot 'src-tauri\target\release\samewave-island.exe'
if(Get-Process -Name samewave-island -ErrorAction SilentlyContinue){throw 'An island is already running; no process was stopped'}
if(Get-NetTCPConnection -LocalPort 9223 -State Listen -ErrorAction SilentlyContinue){throw 'QA endpoint must be closed before normal review'}
$owner=Get-Content -LiteralPath (Join-Path $out 'native-final\ownership.json') -Raw | ConvertFrom-Json
if((Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $owner.exeSHA256){throw 'Tested executable changed'}
$previous=Get-Content -LiteralPath (Join-Path $out 'prior-qa-ownership.json') -Raw | ConvertFrom-Json
$source=Get-Process -Id $previous.serverPid -ErrorAction Stop
if($source.StartTime.ToUniversalTime().Ticks -ne [long]$previous.serverStartedTicks){throw 'Previous synthetic source identity changed'}
if(@(Get-NetTCPConnection -LocalPort 17322 -State Listen -ErrorAction Stop | Where-Object {$_.OwningProcess -ne $previous.serverPid}).Count){throw 'Port 17322 is no longer the verified synthetic source'}
Invoke-RestMethod 'http://127.0.0.1:17322/api/push' -Method Post -ContentType 'application/json' -Body '{"type":"clinical:reset"}' | Out-Null
$app=Start-Process -FilePath $exe -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 4
$process=Get-CimInstance Win32_Process -Filter "ProcessId=$($app.Id)"
if(!$process -or $process.ExecutablePath -ne $exe -or $process.CommandLine -match 'qa-cdp|hover-diagnostics'){throw 'Normal launch identity or arguments mismatch'}
$windows=python -X utf8 -B (Join-Path $PSScriptRoot 'inspect-uiux-native.py') | ConvertFrom-Json
$island=@($windows | Where-Object {$_.pid -eq $app.Id -and $_.title -eq 'Samewave Island'})
if($island.Count -ne 1 -or !$island[0].visible){throw 'Normal island did not become visible'}
if($windows | Where-Object {$_.title -like '*synthetic witness*' -or $_.title -like '*synthetic background*'}){throw 'QA background remained open'}
$result=[ordered]@{normalLaunch=$true;pid=$app.Id;executable=$process.ExecutablePath;commandLine=$process.CommandLine;exeSHA256=$owner.exeSHA256;qaPortClosed=(-not [bool](Get-NetTCPConnection -LocalPort 9223 -State Listen -ErrorAction SilentlyContinue));qaWitnessClosed=$true;window=$island[0];capturedAt=(Get-Date -Format o)}
if(!$result.qaPortClosed){throw 'Normal launch unexpectedly exposed a QA endpoint'}
$result | ConvertTo-Json -Depth 7 | Set-Content -LiteralPath (Join-Path $out 'normal-launch.json') -Encoding utf8
$result | ConvertTo-Json -Depth 7
