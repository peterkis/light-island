param([Parameter(Mandatory=$true)][int]$RootProcess,[string]$Tag='idle',[int]$Seconds=5)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
$targetInfo=Get-Process -Id $RootProcess
if($targetInfo.Path -ne (Join-Path $taskRoot 'src-tauri\target\release\samewave-island.exe')){throw 'Verified project executable required'}
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;
public static class LabProbe {
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int left,top,right,bottom;}
 public delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb,IntPtr p);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,System.Text.StringBuilder s,int n);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out Rect r);
 [DllImport("user32.dll")] public static extern int GetWindowRgn(IntPtr h,IntPtr r);
 [DllImport("user32.dll")] public static extern bool GetWindowDisplayAffinity(IntPtr h,out uint a);
 [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int s);
 public static int SourceAffinity(int wanted){int found=-1;EnumWindows((h,p)=>{uint pid;GetWindowThreadProcessId(h,out pid);var title=new System.Text.StringBuilder(256);GetWindowText(h,title,256);if(pid==wanted&&title.ToString().StartsWith("模拟来源边界")){uint value=0;GetWindowDisplayAffinity(h,out value);found=(int)value;return false;}return true;},IntPtr.Zero);return found;}
 [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int x,int y,int r,int b);
 [DllImport("gdi32.dll")] public static extern int GetRgnBox(IntPtr h,out Rect r);
 [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr h);
 public static IntPtr Find(int wanted){IntPtr found=IntPtr.Zero;EnumWindows((h,p)=>{uint pid;GetWindowThreadProcessId(h,out pid);var title=new System.Text.StringBuilder(256);GetWindowText(h,title,256);if(pid==wanted&&title.ToString()=="Samewave Island"){found=h;return false;}return true;},IntPtr.Zero);return found;}
}
'@
$window=[LabProbe]::Find($RootProcess);if($window -eq [IntPtr]::Zero){throw 'Project island HWND not found'}
$all=@(Get-CimInstance Win32_Process);$ids=[System.Collections.Generic.HashSet[int]]::new();[void]$ids.Add($RootProcess)
do{$added=$false;foreach($p in $all){if($ids.Contains([int]$p.ParentProcessId)-and $ids.Add([int]$p.ProcessId)){$added=$true}}}while($added)
$cpuBefore=@{};foreach($number in $ids){$p=Get-Process -Id $number -ErrorAction SilentlyContinue;if($p){$cpuBefore[$number]=$p.CPU}}
$clock=[System.Diagnostics.Stopwatch]::StartNew();$samples=@()
while($clock.Elapsed.TotalSeconds -lt $Seconds){
 $rect=[LabProbe+Rect]::new();[void][LabProbe]::GetWindowRect($window,[ref]$rect);$affinity=[uint32]0;[void][LabProbe]::GetWindowDisplayAffinity($window,[ref]$affinity)
 $region=[LabProbe]::CreateRectRgn(0,0,0,0);$bounds=[LabProbe+Rect]::new();[void][LabProbe]::GetWindowRgn($window,$region);[void][LabProbe]::GetRgnBox($region,[ref]$bounds);[void][LabProbe]::DeleteObject($region)
 $samples += [PSCustomObject]@{ms=[math]::Round($clock.Elapsed.TotalMilliseconds,2);window=@($rect.left,$rect.top,$rect.right,$rect.bottom);region=@($bounds.left,$bounds.top,$bounds.right,$bounds.bottom);captureAffinity=$affinity;dpi=[LabProbe]::GetDpiForWindow($window)}
 Start-Sleep -Milliseconds 16
}
$rows=@(foreach($number in $ids){$p=Get-Process -Id $number -ErrorAction SilentlyContinue;if($p){[PSCustomObject]@{pid=$number;name=$p.ProcessName;privateCommitMiB=[math]::Round($p.PrivateMemorySize64/1MB,2);cpuDeltaSeconds=[math]::Max(0,$p.CPU-$cpuBefore[$number])}}})
$working=Get-CimInstance Win32_PerfRawData_PerfProc_Process | Where-Object {$ids.Contains([int]$_.IDProcess)} | Measure-Object WorkingSetPrivate -Sum
$notificationState=0;[void][LabProbe]::SHQueryUserNotificationState([ref]$notificationState)
$output=[ordered]@{capturedAt=(Get-Date -Format o);tag=$Tag;rootPid=$RootProcess;scope='Owned app and all discovered WebView2 descendants; studio/source included when open; no desktop image or report text';seconds=$clock.Elapsed.TotalSeconds;windowChanges=@($samples|ForEach-Object {$_.window -join ','}|Select-Object -Unique).Count-1;privateWorkingSetMiB=[math]::Round($working.Sum/1MB,2);privateCommitMiB=[math]::Round(($rows|Measure-Object privateCommitMiB -Sum).Sum,2);cpuMachinePercent=[math]::Round(100*($rows|Measure-Object cpuDeltaSeconds -Sum).Sum/$clock.Elapsed.TotalSeconds/[Environment]::ProcessorCount,3);processes=$rows;samples=$samples;meaning='Finite passive HWND/HRGN/display-affinity samples, not DWM frames or actual mouse-click delivery'}
$output.islandVisible=[LabProbe]::IsWindowVisible($window);$output.notificationState=$notificationState;$output.sourceCaptureAffinity=[LabProbe]::SourceAffinity($RootProcess)
$output | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskRoot "evidence\lab-reader-20261009\native-$Tag.json") -Encoding utf8
[PSCustomObject]@{tag=$Tag;samples=$samples.Count;windowChanges=$output.windowChanges;affinity=@($samples.captureAffinity|Select-Object -Unique);privateWorkingSetMiB=$output.privateWorkingSetMiB;cpuMachinePercent=$output.cpuMachinePercent} | ConvertTo-Json
