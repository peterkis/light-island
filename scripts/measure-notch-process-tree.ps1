$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$exe = Join-Path $root 'src-tauri\target\release\samewave-island.exe'
$all = @(Get-CimInstance Win32_Process)
$roots = @($all | Where-Object { $_.ExecutablePath -eq $exe })
if (-not $roots) { throw 'Prototype process not found.' }
$ids = [System.Collections.Generic.HashSet[int]]::new()
foreach ($p in $roots) { [void]$ids.Add([int]$p.ProcessId) }
do { $added = $false; foreach ($p in $all) { if ($ids.Contains([int]$p.ParentProcessId) -and $ids.Add([int]$p.ProcessId)) { $added = $true } } } while ($added)
$initial = @{}; foreach ($procId in $ids) { $p = Get-Process -Id $procId -ErrorAction SilentlyContinue; if ($p) { $initial[$procId] = $p.CPU } }
$timer = [System.Diagnostics.Stopwatch]::StartNew(); Start-Sleep -Seconds 5
$rows = foreach ($procId in $ids) {
  $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if ($p) { [pscustomobject]@{ pid=$procId; name=$p.ProcessName; workingSetMiB=[math]::Round($p.WorkingSet64/1MB,2); privateMiB=[math]::Round($p.PrivateMemorySize64/1MB,2); cpuDeltaSeconds=[math]::Round([math]::Max(0,$p.CPU-$initial[$procId]),4) } }
}
$seconds=$timer.Elapsed.TotalSeconds; $cores=[Environment]::ProcessorCount
$result=[ordered]@{ capturedAt=(Get-Date -Format o); includes='Application and all discovered descendants including WebView2; excludes demo Node server and build tools'; sampleSeconds=[math]::Round($seconds,2); logicalProcessors=$cores; workingSetMiB=[math]::Round(($rows|Measure-Object workingSetMiB -Sum).Sum,2); privateMiB=[math]::Round(($rows|Measure-Object privateMiB -Sum).Sum,2); cpuMachinePercent=[math]::Round(100*($rows|Measure-Object cpuDeltaSeconds -Sum).Sum/$seconds/$cores,3); processes=@($rows) }
$privateRows=@(Get-CimInstance Win32_PerfRawData_PerfProc_Process | Where-Object { $ids.Contains([int]$_.IDProcess) }); $result['privateWorkingSetMiB']=[math]::Round(($privateRows | Measure-Object WorkingSetPrivate -Sum).Sum/1MB,2)
$result|ConvertTo-Json -Depth 6|Set-Content "$root\evidence\notch-process-tree.json" -Encoding UTF8
$result|ConvertTo-Json -Depth 6
