import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const out=process.env.ISLAND_QA_OUTPUT;
assert(/^evidence\/app-split-20261013\/[a-z0-9-]+$/.test(out??''));
await mkdir(out+'/temp',{recursive:true});
const ps=code=>execFileSync('powershell',['-NoProfile','-Command',code],{encoding:'utf8',windowsHide:true});
const parse=text=>JSON.parse(text.replace(/^\uFEFF/,'').trim());
const active=new Map(),browsers=new Map();
const report={pass:false,sourcePort:17323,cases:[],launches:[],profiles:[]};
const empty=()=>ps("if(Get-Process -Name samewave-island,samewave-workbench -ErrorAction SilentlyContinue){throw 'An existing application must not be reused'};if(Get-NetTCPConnection -LocalPort 17323,9223,9224 -State Listen -ErrorAction SilentlyContinue){throw 'An existing port must not be reused'}");
empty();
const launch=async kind=>{
 assert(['island','workbench'].includes(kind));
 const sha256=createHash('sha256').update(await readFile(`dist/desktop/samewave-${kind}.exe`)).digest('hex');
 const app=parse(ps(`$ErrorActionPreference='Stop';$taskTemp=[IO.Path]::GetFullPath('${out}/temp');$env:TEMP=$taskTemp;$env:TMP=$taskTemp;$env:ISLAND_DEMO_PORT='17323';$env:ISLAND_DEMO_URL='ws://127.0.0.1:17323/events';$taskExe=[IO.Path]::GetFullPath('dist/desktop/samewave-${kind}.exe');$p=Start-Process -FilePath $taskExe -ArgumentList '${kind==='workbench'?'--qa-cdp --qa-control':'--qa-cdp'}' -WindowStyle Hidden -PassThru;@{kind='${kind}';rootPid=$p.Id;startedTicks=$p.StartTime.ToUniversalTime().Ticks.ToString();executable=$taskExe;port=${kind==='workbench'?9224:9223}}|ConvertTo-Json -Compress`));
 app.sha256=sha256;
 active.set(kind,app);report.launches.push(app);return app;
};
const verify=app=>{
 assert(Number.isSafeInteger(app.rootPid)&&/^\d+$/.test(app.startedTicks));
 const snapshot=parse(ps(`$ErrorActionPreference='Stop';$p=Get-Process -Id ${app.rootPid};$taskExe=[IO.Path]::GetFullPath('dist/desktop/samewave-${app.kind}.exe');if($p.Path -ne $taskExe -or $p.StartTime.ToUniversalTime().Ticks -ne [long]'${app.startedTicks}'){throw 'Application identity changed'};$all=@(Get-CimInstance Win32_Process);$ids=[Collections.Generic.HashSet[int]]::new();[void]$ids.Add(${app.rootPid});do{$added=$false;foreach($item in $all){if($ids.Contains([int]$item.ParentProcessId)-and $ids.Add([int]$item.ProcessId)){$added=$true}}}while($added);$listeners=@(Get-NetTCPConnection -LocalPort ${app.port} -State Listen);if(-not $listeners.Count -or @($listeners|Where-Object {-not $ids.Contains([int]$_.OwningProcess)}).Count){throw 'CDP ownership mismatch'};${app.kind==='workbench'?"$source=@(Get-NetTCPConnection -LocalPort 17323 -State Listen);if(-not $source.Count -or @($source|Where-Object {$_.OwningProcess -ne $p.Id}).Count){throw 'Source ownership mismatch'};":''}$profiles=@($all|Where-Object {$ids.Contains([int]$_.ProcessId)-and $_.Name -eq 'msedgewebview2.exe'}|ForEach-Object {if($_.CommandLine -match '--user-data-dir="([^\"]+)"'){$matches[1]}}|Select-Object -Unique);@{rootPid=$p.Id;processIds=@($ids);profiles=$profiles}|ConvertTo-Json -Depth 4 -Compress`));
 return snapshot;
};
const connect=async app=>{
 await expect.poll(async()=>{try{return (await fetch(`http://127.0.0.1:${app.port}/json/version`,{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}},{timeout:15000}).toBe(true);
 const snapshot=verify(app);report.profiles.push({kind:app.kind,...snapshot});
 const browser=await chromium.connectOverCDP(`http://127.0.0.1:${app.port}`);browsers.set(app.kind,browser);
 const path=app.kind==='island'?'clinical.html?view=island':'workbench.html?app=workbench';
 const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/'+path));assert(page);return page;
};
const invoke=(page,cmd,args={})=>page.evaluate(({cmd,args})=>window.__TAURI_INTERNALS__.invoke(cmd,args),{cmd,args});
const quit=async(kind,page)=>{
 const app=active.get(kind);verify(app);await invoke(page,'qa_exit').catch(()=>{});
 await expect.poll(()=>{try{ps(`if(Get-Process -Id ${app.rootPid} -ErrorAction SilentlyContinue){throw 'Owned application still running'}`);return true;}catch{return false;}},{timeout:10000}).toBe(true);
 await browsers.get(kind)?.close();browsers.delete(kind);active.delete(kind);
};
try{
 const island=await connect(await launch('island')),el=island.getByTestId('clinical-island');
 await expect(el).toHaveAttribute('data-connection','offline',{timeout:10000});
 await el.getByRole('button',{name:'打开协作动态'}).click();await expect(el).toHaveAttribute('data-motion-phase','settled');
 await el.getByRole('button',{name:'开始 25 分钟'}).click();
 const deadline=Number(await el.getAttribute('data-timer-deadline'));assert(deadline>Date.now());
 report.cases.push({name:'island alone starts its personal timer while source is offline',pass:true});
 const workbench=await connect(await launch('workbench'));
 await expect(el).toHaveAttribute('data-connection','online',{timeout:20000});
 assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);
 report.cases.push({name:'island-first startup connects without replacing the personal deadline',pass:true});
 const first=report.profiles.slice(0,2);assert(first.every(p=>p.profiles.length));
 assert(!first[0].profiles.some(path=>first[1].profiles.includes(path)));
 report.cases.push({name:'each EXE owns a separate WebView data directory',pass:true});
 for(const kind of ['island','workbench']){
  ps(`$taskExe=[IO.Path]::GetFullPath('dist/desktop/samewave-${kind}.exe');$p=Start-Process -FilePath $taskExe -ArgumentList '--qa-cdp' -WindowStyle Hidden -PassThru;if(-not $p.WaitForExit(10000)){throw 'Duplicate instance did not exit'};if(@(Get-Process -Name samewave-island,samewave-workbench -ErrorAction SilentlyContinue).Count -ne 2){throw 'Duplicate launch changed application count'}`);
  for(const app of active.values())verify(app);
  assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);
 }
 report.cases.push({name:'repeated launches affect only the matching existing application',pass:true});
 await quit('workbench',workbench);await expect(el).toHaveAttribute('data-connection','offline');await quit('island',island);empty();
 const firstWorkbench=await connect(await launch('workbench'));
 await expect(firstWorkbench.getByTestId('clinical-island')).toBeVisible();
 assert.equal((await invoke(firstWorkbench,'workbench_status')).clients.filter(c=>c.role==='island').length,0);
 report.cases.push({name:'workbench alone starts its embedded source and independent preview',pass:true});
 const secondIsland=await connect(await launch('island'));
 await expect(secondIsland.getByTestId('clinical-island')).toHaveAttribute('data-connection','online',{timeout:20000});
 report.cases.push({name:'workbench-first startup connects the separate island',pass:true});
 await quit('island',secondIsland);assert((await fetch('http://127.0.0.1:17323/api/health')).ok);await quit('workbench',firstWorkbench);empty();
 report.pass=true;
}finally{
 await writeFile(out+'/startup.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,cases:report.cases}));
 for(const [kind,browser] of browsers){
  try{verify(active.get(kind));const page=browser.contexts().flatMap(c=>c.pages())[0];await invoke(page,'qa_exit').catch(()=>{});}catch{/* An unverified process must not be touched. */}
  await browser.close().catch(()=>{});
 }
}
