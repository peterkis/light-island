param(
 [Parameter(Mandatory=$true)][ValidateSet('Start','Verify','Measure')][string]$Action,
 [Parameter(Mandatory=$true)][string]$Output,
 [ValidateSet(17323)][int]$SourcePort=17323
)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$out=[IO.Path]::GetFullPath((Join-Path $taskRoot $Output))
$evidenceRoot=[IO.Path]::GetFullPath((Join-Path $taskRoot 'evidence'))+[IO.Path]::DirectorySeparatorChar
if(-not $out.StartsWith($evidenceRoot,[StringComparison]::OrdinalIgnoreCase)){throw 'QA output must stay inside this repository evidence directory'}
$manifest=Join-Path $out 'ownership.json'
function Get-Tree([int]$RootId){
 $all=@(Get-CimInstance Win32_Process);$ids=[Collections.Generic.HashSet[int]]::new();[void]$ids.Add($RootId)
 do{$added=$false;foreach($item in $all){if($ids.Contains([int]$item.ParentProcessId)-and $ids.Add([int]$item.ProcessId)){$added=$true}}}while($added)
 @($all|Where-Object {$ids.Contains([int]$_.ProcessId)})
}
if($Action -eq 'Start'){
 if(Test-Path -LiteralPath $manifest){throw 'Choose a fresh output directory'}
 if(Get-Process -Name samewave-island,samewave-workbench -ErrorAction SilentlyContinue){throw 'An application already exists; no existing process was stopped'}
 if(Get-NetTCPConnection -LocalPort $SourcePort,9223,9224 -State Listen -ErrorAction SilentlyContinue){throw 'QA port occupied; no existing process was stopped'}
 New-Item -ItemType Directory -Path $out,(Join-Path $out 'temp') | Out-Null
 $oldTemp=$env:TEMP;$oldTmp=$env:TMP;$oldSource=$env:ISLAND_DEMO_URL;$oldPort=$env:ISLAND_DEMO_PORT
 try{
  $env:TEMP=Join-Path $out 'temp';$env:TMP=$env:TEMP;$env:ISLAND_DEMO_PORT=[string]$SourcePort;$env:ISLAND_DEMO_URL="ws://127.0.0.1:$SourcePort/events"
  $apps=@()
  foreach($kind in 'workbench','island'){
   $exe=Join-Path $taskRoot "dist\desktop\samewave-$kind.exe"
   if(-not(Test-Path -LiteralPath $exe)){throw 'Build both desktop executables first'}
   $arguments=if($kind -eq 'workbench'){'--qa-cdp --qa-control'}else{'--qa-cdp --hover-diagnostics'}
   $process=Start-Process -FilePath $exe -ArgumentList $arguments -WindowStyle Hidden -PassThru
   $apps+=[ordered]@{kind=$kind;rootPid=$process.Id;startedTicks=$process.StartTime.ToUniversalTime().Ticks.ToString();executable=$exe;sha256=(Get-FileHash -LiteralPath $exe -Algorithm SHA256).Hash.ToLowerInvariant();port=if($kind -eq 'workbench'){9224}else{9223}}
  }
  [ordered]@{sourcePort=$SourcePort;capturedAt=(Get-Date -Format o);apps=$apps}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $manifest -Encoding utf8
 }finally{$env:TEMP=$oldTemp;$env:TMP=$oldTmp;$env:ISLAND_DEMO_URL=$oldSource;$env:ISLAND_DEMO_PORT=$oldPort}
}
if($Action -eq 'Start'){for($attempt=0;$attempt -lt 80;$attempt++){try{$readyA=Invoke-RestMethod 'http://127.0.0.1:9223/json/version' -TimeoutSec 1;$readyB=Invoke-RestMethod 'http://127.0.0.1:9224/json/version' -TimeoutSec 1;$readySource=Invoke-RestMethod "http://127.0.0.1:$SourcePort/api/health" -TimeoutSec 1;break}catch{Start-Sleep -Milliseconds 250}}}
$owner=Get-Content -LiteralPath $manifest -Raw -Encoding utf8|ConvertFrom-Json
$trees=@()
foreach($app in $owner.apps){
 $process=Get-Process -Id $app.rootPid -ErrorAction Stop
 if($process.Path -ne $app.executable -or $process.StartTime.ToUniversalTime().Ticks -ne [long]$app.startedTicks){throw 'QA process identity changed'}
 $tree=Get-Tree $app.rootPid;$listener=@(Get-NetTCPConnection -LocalPort $app.port -State Listen -ErrorAction Stop)
 if(-not $listener.Count -or @($listener|Where-Object {$_.OwningProcess -notin $tree.ProcessId}).Count){throw 'QA endpoint ownership mismatch'}
 $trees+=@{kind=$app.kind;processIds=@($tree.ProcessId)}
}
$source=@(Get-NetTCPConnection -LocalPort $owner.sourcePort -State Listen -ErrorAction Stop)
$workbench=($owner.apps|Where-Object kind -eq 'workbench')
if(@($source|Where-Object {$_.OwningProcess -ne $workbench.rootPid}).Count){throw 'Source is not owned by the workbench executable'}
if($Action -eq 'Measure'){
 $result=@();foreach($tree in $trees){$perf=@(Get-CimInstance Win32_PerfFormattedData_PerfProc_Process|Where-Object {$_.IDProcess -in $tree.processIds});$result+=@{kind=$tree.kind;processCount=$perf.Count;privateWorkingSetMiB=[Math]::Round((($perf|Measure-Object WorkingSetPrivate -Sum).Sum/1MB),2);privateCommitMiB=[Math]::Round((($perf|Measure-Object PrivateBytes -Sum).Sum/1MB),2)}}
 $result|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $out 'process-trees.json') -Encoding utf8
 $result|ConvertTo-Json -Depth 5
}else{[ordered]@{verified=$true;sourcePort=$owner.sourcePort;trees=$trees}|ConvertTo-Json -Depth 8}
