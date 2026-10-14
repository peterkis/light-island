import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out='evidence/app-split-20261013/compatibility';
const owner=JSON.parse((await readFile(out+'/ownership.json','utf8')).replace(/^\uFEFF/,''));
for(const app of owner){
 const port=app.kind==='island'?9223:9224;
 execFileSync('powershell',['-NoProfile','-Command',`$p=Get-Process -Id ${app.rootPid};if($p.Path -ne '${app.executable}' -or $p.StartTime.ToUniversalTime().Ticks -ne [long]'${app.startedTicks}'){throw 'Process identity changed'};$all=@(Get-CimInstance Win32_Process);$ids=[Collections.Generic.HashSet[int]]::new();[void]$ids.Add(${app.rootPid});do{$added=$false;foreach($i in $all){if($ids.Contains([int]$i.ParentProcessId)-and $ids.Add([int]$i.ProcessId)){$added=$true}}}while($added);$listeners=@(Get-NetTCPConnection -LocalPort ${port} -State Listen);if(-not $listeners.Count -or @($listeners|Where-Object {$_.OwningProcess -notin $ids}).Count){throw 'Endpoint ownership changed'}`],{windowsHide:true});
}
const browsers=[],report={pass:false};
try{
 for(const kind of ['workbench','island']){
  const browser=await chromium.connectOverCDP(`http://127.0.0.1:${kind==='island'?9223:9224}`);browsers.push(browser);
  const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/'+(kind==='island'?'clinical.html?view=island':'workbench.html?app=workbench')));assert(page);
  if(kind==='workbench'){
   await expect(page.getByRole('alert')).toContainText('17322');const status=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workbench_status'));assert.equal(status.listening,false);assert(status.error.includes('未停止其他进程'));report.portConflict=status;
  }else{
   await expect(page.getByTestId('clinical-island')).toHaveAttribute('data-connection','incompatible',{timeout:12000});report.incompatibleSourceRejected=true;
  }
 }
 report.pass=true;
}finally{
 await writeFile(out+'/compatibility.json',JSON.stringify(report,null,2));
 for(const browser of browsers){const page=browser.contexts().flatMap(c=>c.pages())[0];if(page)await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('qa_exit')).catch(()=>{});await browser.close().catch(()=>{});}
 console.log(JSON.stringify({pass:report.pass,incompatibleSourceRejected:report.incompatibleSourceRejected,portConflict:report.portConflict?.error}));
}
