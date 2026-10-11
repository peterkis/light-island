param([Parameter(Mandatory=$true)][string]$Ownership,[Parameter(Mandatory=$true)][string]$Output)
$ErrorActionPreference='Stop'
$owner=Get-Content -LiteralPath $Ownership -Raw | ConvertFrom-Json
$owned=Get-Process -Id $owner.rootPid
if($owned.Path -ne $owner.exe){throw 'Owned executable mismatch'}
if((Get-FileHash -LiteralPath $owner.exe).Hash -ne $owner.sha256){throw 'Executable hash mismatch'}
$all=@(Get-CimInstance Win32_Process)
$ids=[Collections.Generic.HashSet[int]]::new();[void]$ids.Add($owner.rootPid)
do{$added=$false;foreach($p in $all){if($ids.Contains([int]$p.ParentProcessId) -and $ids.Add([int]$p.ProcessId)){$added=$true}}}while($added)
$listeners=@(Get-NetTCPConnection -LocalPort 9223 -State Listen -ErrorAction Stop)
if(!$listeners.Count -or @($listeners | Where-Object {!$ids.Contains([int]$_.OwningProcess)}).Count){throw 'QA endpoint is not owned'}
Add-Type -TypeDefinition @'
using System;using System.Runtime.InteropServices;using System.Text;
public static class ReaderFocusProbe {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 public static string Title(IntPtr h){var s=new StringBuilder(256);GetWindowText(h,s,256);return s.ToString();}
}
'@
$before=[ReaderFocusProbe]::GetForegroundWindow()
$beforePid=[uint32]0
[void][ReaderFocusProbe]::GetWindowThreadProcessId($before,[ref]$beforePid)
if($beforePid -ne $owner.rootPid -or [ReaderFocusProbe]::Title($before) -notlike '*原型试验台*'){throw 'Activate the owned studio using Computer Use first'}
node scripts/qa-reader-focus.mjs $Ownership "$Output.webview.json"
if($LASTEXITCODE -ne 0){throw 'Reader scenario probe failed'}
$after=[ReaderFocusProbe]::GetForegroundWindow()
$result=[pscustomobject]@{rootPid=$owner.rootPid;exeSHA256=$owner.sha256;foregroundBefore=$before.ToInt64();foregroundAfter=$after.ToInt64();beforeTitle=[ReaderFocusProbe]::Title($before);afterTitle=[ReaderFocusProbe]::Title($after);pass=($before -eq $after);scope='Passive Win32 foreground measurement around a clinical:view broadcast; no island click'}
$result | ConvertTo-Json | Set-Content -LiteralPath $Output -Encoding utf8
$result | ConvertTo-Json
if(!$result.pass){exit 1}
