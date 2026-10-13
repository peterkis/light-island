param(
 [Parameter(Mandatory=$true)][ValidateSet('Start','Verify','Measure','Stop')][string]$Action,
 [Parameter(Mandatory=$true)][string]$Output,
 [string]$Executable,
 [ValidatePattern('^[a-z0-9-]+$')][string]$SampleName='process-tree'
)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$out=[IO.Path]::GetFullPath((Join-Path $taskRoot $Output))
$evidenceRoot=[IO.Path]::GetFullPath((Join-Path $taskRoot 'evidence'))+[IO.Path]::DirectorySeparatorChar
if(-not $out.StartsWith($evidenceRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'QA output must stay inside this project evidence directory'}
$manifestPath=Join-Path $out 'ownership.json'
function Get-Tree([int]$RootId){
 $all=@(Get-CimInstance Win32_Process)
 $ids=[Collections.Generic.HashSet[int]]::new();[void]$ids.Add($RootId)
 do{$added=$false;foreach($item in $all){if($ids.Contains([int]$item.ParentProcessId)-and $ids.Add([int]$item.ProcessId)){$added=$true}}}while($added)
 @($all | Where-Object {$ids.Contains([int]$_.ProcessId)})
}
function Verify-Owned($Owner){
 $app=Get-Process -Id $Owner.rootPid -ErrorAction Stop
 if($app.Path -ne $Owner.executable -or $app.StartTime.ToUniversalTime().Ticks -ne [long]$Owner.rootStartedTicks){throw 'QA application identity changed'}
 $tree=Get-Tree $Owner.rootPid
 $listener=@(Get-NetTCPConnection -LocalPort 9223 -State Listen -ErrorAction SilentlyContinue)
 if(-not $listener.Count -or @($listener | Where-Object {$_.OwningProcess -notin $tree.ProcessId}).Count){throw 'QA endpoint is not owned by this application tree'}
 $server=Get-CimInstance Win32_Process -Filter "ProcessId=$($Owner.serverPid)"
 if(-not $server -or $server.CommandLine -notlike '*server\demo-server.mjs*'){throw 'Synthetic server identity changed'}
 $serverProcess=Get-Process -Id $Owner.serverPid
 if($serverProcess.StartTime.ToUniversalTime().Ticks -ne [long]$Owner.serverStartedTicks){throw 'Synthetic server PID was reused'}
 $source=@(Get-NetTCPConnection -LocalPort 17322 -State Listen -ErrorAction Stop)
 if(@($source | Where-Object {$_.OwningProcess -ne $Owner.serverPid}).Count){throw 'Synthetic port is no longer owned by this session'}
 $tree
}
if($Action -eq 'Start'){
 if(Test-Path -LiteralPath $manifestPath){throw 'Choose a fresh output directory; prior ownership evidence is immutable'}
 $exe=[IO.Path]::GetFullPath((Join-Path $taskRoot $Executable))
 $allowed=@((Join-Path $taskRoot 'src-tauri\target\release\samewave-island.exe'),(Join-Path $taskRoot 'evidence\backups\optimization-20261013\baseline-executable\samewave-island.exe'))
 if($exe -notin $allowed -or -not(Test-Path -LiteralPath $exe)){throw 'Only the current build or verified baseline executable is permitted'}
 if(Get-Process -Name samewave-island -ErrorAction SilentlyContinue){throw 'An island process already exists; no process was stopped'}
 if(Get-NetTCPConnection -LocalPort 17322,9223 -State Listen -ErrorAction SilentlyContinue){throw 'A QA port is occupied; no existing process was stopped'}
 New-Item -ItemType Directory -Force -Path $out,(Join-Path $out 'temp') | Out-Null
 $oldTemp=$env:TEMP;$oldTmp=$env:TMP;$oldPort=$env:ISLAND_DEMO_PORT
 $server=$null;$app=$null
 try{
  $env:TEMP=Join-Path $out 'temp';$env:TMP=$env:TEMP;$env:ISLAND_DEMO_PORT='17322'
  $server=Start-Process (Get-Command node).Source -ArgumentList ('"'+(Join-Path $taskRoot 'server\demo-server.mjs')+'"') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $out 'server.log') -RedirectStandardError (Join-Path $out 'server-error.log')
  $healthy=$false
  for($attempt=0;$attempt -lt 40;$attempt++){try{$response=Invoke-RestMethod 'http://127.0.0.1:17322/api/clinical-state' -TimeoutSec 1;if($response.type -eq 'clinical:snapshot'){$healthy=$true;break}}catch{};Start-Sleep -Milliseconds 250}
  if(-not $healthy){throw 'Owned synthetic server failed to start'}
  $clock=[Diagnostics.Stopwatch]::StartNew()
  $app=Start-Process $exe -ArgumentList '--qa-cdp --hover-diagnostics' -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru
  $owner=[ordered]@{verified=$false;rootPid=$app.Id;rootStartedTicks=$app.StartTime.ToUniversalTime().Ticks;serverPid=$server.Id;serverStartedTicks=$server.StartTime.ToUniversalTime().Ticks;port=9223;executable=$exe;exeSHA256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant();arguments='--qa-cdp --hover-diagnostics';studio=$false;capturedAt=(Get-Date -Format o)}
  for($attempt=0;$attempt -lt 80;$attempt++){
   try{$tree=Verify-Owned ([pscustomobject]$owner);$version=Invoke-RestMethod 'http://127.0.0.1:9223/json/version' -TimeoutSec 1;$owner.verified=$true;break}catch{Start-Sleep -Milliseconds 250}
  }
  if(-not $owner.verified){throw 'Owned QA endpoint did not become ready'}
  $owner.qaEndpointReadyMs=$clock.ElapsedMilliseconds;$owner.browser=$version.Browser;$owner.processes=@($tree | Select-Object ProcessId,ParentProcessId,Name)
  $owner | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
  $owner | ConvertTo-Json -Depth 6
 }catch{
  if($app){$p=Get-Process -Id $app.Id -ErrorAction SilentlyContinue;if($p -and $p.Path -eq $exe){Stop-Process -Id $p.Id}}
  if($server){$p=Get-Process -Id $server.Id -ErrorAction SilentlyContinue;if($p -and $p.StartTime -eq $server.StartTime){Stop-Process -Id $p.Id}}
  throw
 }finally{$env:TEMP=$oldTemp;$env:TMP=$oldTmp;$env:ISLAND_DEMO_PORT=$oldPort}
 exit
}
$owner=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if($Action -eq 'Stop'){
 $app=Get-Process -Id $owner.rootPid -ErrorAction Stop
 if($app.Path -ne $owner.executable -or $app.StartTime.ToUniversalTime().Ticks -ne [long]$owner.rootStartedTicks){throw 'QA application identity changed'}
 $server=Get-CimInstance Win32_Process -Filter "ProcessId=$($owner.serverPid)"
 if(-not $server -or $server.CommandLine -notlike '*server\demo-server.mjs*'){throw 'Synthetic server identity changed'}
 $serverProcess=Get-Process -Id $owner.serverPid
 if($serverProcess.StartTime.ToUniversalTime().Ticks -ne [long]$owner.serverStartedTicks){throw 'Synthetic server PID was reused'}
 $tree=Get-Tree $owner.rootPid
}else{$tree=Verify-Owned $owner}
if($Action -eq 'Verify'){[pscustomobject]@{verified=$true;rootPid=$owner.rootPid;serverPid=$owner.serverPid;port=9223;processCount=$tree.Count} | ConvertTo-Json;exit}
if($Action -eq 'Measure'){
 $before=@{};foreach($item in $tree){$p=Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue;if($p){$before[$p.Id]=$p.CPU}}
 $clock=[Diagnostics.Stopwatch]::StartNew();Start-Sleep -Seconds 5
 $current=Get-Tree $owner.rootPid
 $rows=@(foreach($item in $current){$p=Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue;if($p){[pscustomobject]@{pid=$p.Id;name=$p.ProcessName;privateCommitMiB=[math]::Round($p.PrivateMemorySize64/1MB,2);workingSetMiB=[math]::Round($p.WorkingSet64/1MB,2);cpuDeltaSeconds=if($before.ContainsKey($p.Id)){[math]::Max(0,$p.CPU-$before[$p.Id])}else{0};newDuringSample=(-not $before.ContainsKey($p.Id))}}})
 $privateWorking=Get-CimInstance Win32_PerfRawData_PerfProc_Process | Where-Object {$_.IDProcess -in $current.ProcessId} | Measure-Object WorkingSetPrivate -Sum
 $result=[ordered]@{capturedAt=(Get-Date -Format o);exeSHA256=$owner.exeSHA256;scope='Owned native application and all discovered WebView2 descendants, no studio; excludes synthetic Node server and QA tools';sampleSeconds=$clock.Elapsed.TotalSeconds;privateWorkingSetMiB=[math]::Round($privateWorking.Sum/1MB,2);privateCommitMiB=[math]::Round(($rows|Measure-Object privateCommitMiB -Sum).Sum,2);cpuMachinePercent=[math]::Round(100*($rows|Measure-Object cpuDeltaSeconds -Sum).Sum/$clock.Elapsed.TotalSeconds/[Environment]::ProcessorCount,3);processes=$rows}
 $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $out ($SampleName+'.json')) -Encoding UTF8
 $result | ConvertTo-Json -Depth 5;exit
}
if($Action -eq 'Stop'){
 $owned=@(foreach($item in $tree){$p=Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue;if($p){[pscustomobject]@{id=$p.Id;ticks=$p.StartTime.ToUniversalTime().Ticks;path=$p.Path}}})
 Stop-Process -Id $owner.rootPid
 Start-Sleep -Milliseconds 1000
 foreach($item in $owned){$p=Get-Process -Id $item.id -ErrorAction SilentlyContinue;if($p -and $p.StartTime.ToUniversalTime().Ticks -eq $item.ticks -and $p.Path -eq $item.path){Stop-Process -Id $p.Id}}
 $server=Get-Process -Id $owner.serverPid -ErrorAction SilentlyContinue
 if($server -and $server.StartTime.ToUniversalTime().Ticks -eq [long]$owner.serverStartedTicks){Stop-Process -Id $server.Id}
 $result=[ordered]@{stoppedOwnedRoot=$owner.rootPid;stoppedOwnedServer=$owner.serverPid;remainingListeners=@(Get-NetTCPConnection -LocalPort 17322,9223 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess);termination='QA-owned processes stopped; not a normal-exit profile-cleanup acceptance'}
 $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $out 'cleanup.json') -Encoding UTF8
 $result | ConvertTo-Json -Depth 4
}
