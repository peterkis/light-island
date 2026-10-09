param([Parameter(Mandatory=$true)][int]$RootProcess)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$out=Join-Path $taskRoot 'evidence\uiux-continuation-20261008'
$rootProcessInfo=Get-Process -Id $RootProcess
if($rootProcessInfo.Path -ne (Join-Path $taskRoot 'src-tauri\target\release\samewave-island.exe')){throw 'Not the project executable'}
$all=@(Get-CimInstance Win32_Process)
$ids=[System.Collections.Generic.HashSet[int]]::new();[void]$ids.Add($RootProcess)
do{$added=$false;foreach($item in $all){if($ids.Contains([int]$item.ParentProcessId) -and $ids.Add([int]$item.ProcessId)){$added=$true}}}while($added)
$before=@{};foreach($processNumber in $ids){$process=Get-Process -Id $processNumber -ErrorAction SilentlyContinue;if($process){$before[$processNumber]=$process.CPU}}
$clock=[System.Diagnostics.Stopwatch]::StartNew()
$gpuSamples=@();$gpuError=$null
for($sample=0;$sample -lt 5;$sample++){
 Start-Sleep -Seconds 1
 try{
  $engines=@(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop | Where-Object {$_.Name -match '^pid_(\d+)_' -and $ids.Contains([int]$Matches[1])} | Select-Object Name,UtilizationPercentage)
  $gpuSamples+=,[ordered]@{at=(Get-Date -Format o);engines=$engines}
 }catch{$gpuError=$_.Exception.Message}
}
$rows=@(foreach($processNumber in $ids){$process=Get-Process -Id $processNumber -ErrorAction SilentlyContinue;if($process){[pscustomobject]@{pid=$processNumber;name=$process.ProcessName;privateMiB=[math]::Round($process.PrivateMemorySize64/1MB,2);workingSetMiB=[math]::Round($process.WorkingSet64/1MB,2);cpuDeltaSeconds=[math]::Max(0,$process.CPU-$before[$processNumber])}}})
$privateWorking=Get-CimInstance Win32_PerfRawData_PerfProc_Process | Where-Object {$ids.Contains([int]$_.IDProcess)} | Measure-Object WorkingSetPrivate -Sum
$result=[ordered]@{capturedAt=(Get-Date -Format o);scope='Verified native app and discovered WebView2 descendants; no studio; excludes demo server and QA tools';sampleSeconds=$clock.Elapsed.TotalSeconds;privateWorkingSetMiB=[math]::Round($privateWorking.Sum/1MB,2);privateCommitMiB=[math]::Round(($rows|Measure-Object privateMiB -Sum).Sum,2);cpuMachinePercent=[math]::Round(100*($rows|Measure-Object cpuDeltaSeconds -Sum).Sum/$clock.Elapsed.TotalSeconds/[Environment]::ProcessorCount,3);processes=$rows;gpu=[ordered]@{status=if($gpuError){'UNAVAILABLE'}elseif(!$gpuSamples.engines){'NOT_OBSERVED'}else{'SAMPLED'};meaning='Per-process GPU engine counters; not DWM frame telemetry or whole-machine GPU utilization';error=$gpuError;samples=$gpuSamples}}
$result | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $out 'process-tree.json') -Encoding UTF8
$result | ConvertTo-Json -Depth 8
