import {chromium,expect} from '@playwright/test';
import {WebSocketServer} from 'ws';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT;
assert(/^evidence\/app-split-20261013\/[a-z0-9-]+$/.test(out??''));
await mkdir(out+'/temp',{recursive:true});
const ps=code=>execFileSync('powershell',['-NoProfile','-Command',code],{encoding:'utf8',windowsHide:true});
ps("if(Get-Process -Name samewave-island,samewave-workbench -ErrorAction SilentlyContinue){throw 'An existing application must not be reused'};if(Get-NetTCPConnection -LocalPort 17326,9224 -State Listen -ErrorAction SilentlyContinue){throw 'An existing endpoint must not be reused'}");
const server=new WebSocketServer({host:'127.0.0.1',port:17326,path:'/events'});let contacts=0;
server.on('connection',socket=>{contacts++;socket.send(JSON.stringify({type:'transport:hello',protocolVersion:2,sourceSessionId:'unrelated-v2-source'}));socket.on('message',()=>socket.send(JSON.stringify({type:'transport:ready',sourceSessionId:'unrelated-v2-source'})));});
await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
const sha256=createHash('sha256').update(await readFile('dist/desktop/samewave-workbench.exe')).digest('hex');
let browser,page;const report={pass:false,contactsToUnrelatedV2:0};
try{
 const app=JSON.parse(ps(`$ErrorActionPreference='Stop';$taskTemp=[IO.Path]::GetFullPath('${out}/temp');$env:TEMP=$taskTemp;$env:TMP=$taskTemp;$env:ISLAND_DEMO_PORT='17326';$taskExe=[IO.Path]::GetFullPath('dist/desktop/samewave-workbench.exe');$p=Start-Process -FilePath $taskExe -ArgumentList '--qa-cdp' -WindowStyle Hidden -PassThru;@{rootPid=$p.Id;startedTicks=$p.StartTime.ToUniversalTime().Ticks.ToString();executable=$taskExe}|ConvertTo-Json -Compress`));
 app.sha256=sha256;report.app=app;await writeFile(out+'/ownership.json',JSON.stringify(app,null,2));
 await expect.poll(async()=>{try{return (await fetch('http://127.0.0.1:9224/json/version',{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}},{timeout:15000}).toBe(true);
 assert(Number.isSafeInteger(app.rootPid)&&/^\d+$/.test(app.startedTicks));
 ps(`$ErrorActionPreference='Stop';$p=Get-Process -Id ${app.rootPid};if($p.Path -ne [IO.Path]::GetFullPath('dist/desktop/samewave-workbench.exe')-or$p.StartTime.ToUniversalTime().Ticks -ne [long]'${app.startedTicks}'){throw 'Application identity changed'};$all=@(Get-CimInstance Win32_Process);$ids=[Collections.Generic.HashSet[int]]::new();[void]$ids.Add(${app.rootPid});do{$added=$false;foreach($item in $all){if($ids.Contains([int]$item.ParentProcessId)-and$ids.Add([int]$item.ProcessId)){$added=$true}}}while($added);$listeners=@(Get-NetTCPConnection -LocalPort 9224 -State Listen);if(-not$listeners.Count-or@($listeners|Where-Object {-not$ids.Contains([int]$_.OwningProcess)}).Count){throw 'CDP ownership mismatch'}`);
 browser=await chromium.connectOverCDP('http://127.0.0.1:9224');page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/workbench.html?app=workbench'));assert(page);
 await expect(page.getByRole('alert')).toContainText('17326');await expect(page.getByTestId('clinical-island')).toHaveAttribute('data-connection','offline');
 report.status=await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('workbench_status'));assert.equal(report.status.listening,false);
 await page.waitForTimeout(1800);assert.equal(contacts,0);report.pass=true;
}finally{
 report.contactsToUnrelatedV2=contacts;await writeFile(out+'/port-collision.json',JSON.stringify(report,null,2));
 if(page)await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('qa_exit')).catch(()=>{});await browser?.close().catch(()=>{});
 for(const peer of server.clients)peer.terminate();await new Promise(resolve=>server.close(resolve));
 console.log(JSON.stringify({pass:report.pass,contactsToUnrelatedV2:contacts}));
}
