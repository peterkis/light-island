param([Parameter(Mandatory=$true)][int]$RootProcess)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$p=Get-Process -Id $RootProcess
if($p.Path -ne (Join-Path $root 'src-tauri\target\release\samewave-island.exe')){throw 'Not the project executable'}
$all=@(Get-CimInstance Win32_Process)
$ids=[System.Collections.Generic.HashSet[int]]::new();[void]$ids.Add($RootProcess)
do{$added=$false;foreach($item in $all){if($ids.Contains([int]$item.ParentProcessId) -and $ids.Add([int]$item.ProcessId)){$added=$true}}}while($added)
$before=@{};foreach($id in $ids){$process=Get-Process -Id $id -ErrorAction SilentlyContinue;if($process){$before[$id]=$process.CPU}}
$clock=[System.Diagnostics.Stopwatch]::StartNew();Start-Sleep -Seconds 5
$rows=@(foreach($id in $ids){$process=Get-Process -Id $id -ErrorAction SilentlyContinue;if($process){[pscustomobject]@{pid=$id;name=$process.ProcessName;privateMiB=[math]::Round($process.PrivateMemorySize64/1MB,2);workingSetMiB=[math]::Round($process.WorkingSet64/1MB,2);cpuDeltaSeconds=[math]::Max(0,$process.CPU-$before[$id])}}})
$privateWorking=Get-CimInstance Win32_PerfRawData_PerfProc_Process | Where-Object {$ids.Contains([int]$_.IDProcess)} | Measure-Object WorkingSetPrivate -Sum
$result=[ordered]@{capturedAt=(Get-Date -Format o);scope='Native application and all discovered WebView2 descendants; no studio; excludes Node demo and development tools';sampleSeconds=$clock.Elapsed.TotalSeconds;privateWorkingSetMiB=[math]::Round($privateWorking.Sum/1MB,2);privateMiB=[math]::Round(($rows|Measure-Object privateMiB -Sum).Sum,2);cpuMachinePercent=[math]::Round(100*($rows|Measure-Object cpuDeltaSeconds -Sum).Sum/$clock.Elapsed.TotalSeconds/[Environment]::ProcessorCount,3);processes=$rows}
$result | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $root 'evidence\uiux-final-20261006\process-tree.json') -Encoding UTF8
$result | ConvertTo-Json -Depth 5
