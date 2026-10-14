param([switch]$Legacy,[switch]$IslandOnly,[switch]$WorkbenchOnly,[ValidateRange(1024,65535)][int]$SourcePort=0)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
if($IslandOnly -and $WorkbenchOnly){throw 'Choose one launch target'}
$folder=Join-Path $taskRoot 'dist\desktop'
$port=if($SourcePort){$SourcePort}elseif($Legacy){17321}else{17322}
$oldPort=$env:ISLAND_DEMO_PORT;$oldSource=$env:ISLAND_DEMO_URL
$env:ISLAND_DEMO_PORT=[string]$port;$env:ISLAND_DEMO_URL="ws://127.0.0.1:$port/events"
$arguments=if($Legacy){@('--legacy')}else{@()}
try{foreach($kind in @('workbench','island')){
 if(($kind -eq 'workbench' -and $IslandOnly)-or($kind -eq 'island' -and $WorkbenchOnly)){continue}
 $exe=Join-Path $folder "samewave-$kind.exe"
 if(-not(Test-Path -LiteralPath $exe)){throw 'Run npm run desktop:build first'}
 $start=@{FilePath=$exe;WorkingDirectory=$folder;WindowStyle='Hidden'}
 if($arguments.Count){$start.ArgumentList=$arguments}
 Start-Process @start
}

}finally{$env:ISLAND_DEMO_PORT=$oldPort;$env:ISLAND_DEMO_URL=$oldSource}
