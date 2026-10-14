import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT;
assert(out?.startsWith('evidence/app-split-20261013/'));
const owner=JSON.parse((await readFile(out+'/ownership.json','utf8')).replace(/^\uFEFF/,''));
execFileSync('powershell',['-NoProfile','-File','scripts/app-split-qa.ps1','-Action','Verify','-Output',out],{windowsHide:true});
const report={pass:false,cases:[]};
const invoke=(page,cmd,args={})=>page.evaluate(({cmd,args})=>window.__TAURI_INTERNALS__.invoke(cmd,args),{cmd,args});
const find=(browser,path)=>{const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/'+path));assert(page);return page;};
const islandBrowser=await chromium.connectOverCDP('http://127.0.0.1:9223');let workbenchBrowser=await chromium.connectOverCDP('http://127.0.0.1:9224');
const island=find(islandBrowser,'clinical.html?view=island');let workbench=find(workbenchBrowser,'workbench.html?app=workbench');const el=island.getByTestId('clinical-island');
const closed=async(port)=>{await expect.poll(async()=>{try{await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(1000)});return false;}catch{return true;}},{timeout:10000}).toBe(true);};
const restart=()=>{
 const raw=execFileSync('powershell',['-NoProfile','-Command',`$env:TEMP='${out}/temp';$env:TMP=$env:TEMP;$env:ISLAND_DEMO_PORT='17323';$p=Start-Process -FilePath 'dist/desktop/samewave-workbench.exe' -ArgumentList '--qa-cdp --qa-control' -WindowStyle Hidden -PassThru; @{rootPid=$p.Id;startedTicks=$p.StartTime.ToUniversalTime().Ticks.ToString()}|ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true});return JSON.parse(raw.replace(/^\uFEFF/,''));
};
const reattach=async(root)=>{
 await expect.poll(async()=>{try{return (await fetch('http://127.0.0.1:9224/json/version',{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}},{timeout:15000}).toBe(true);
 // Update the exact restarted identity, then verify port ownership before CDP.
 const app=owner.apps.find(a=>a.kind==='workbench');app.rootPid=root.rootPid;app.startedTicks=root.startedTicks;await writeFile(out+'/ownership.json',JSON.stringify(owner,null,2));
 execFileSync('powershell',['-NoProfile','-File','scripts/app-split-qa.ps1','-Action','Verify','-Output',out],{windowsHide:true});
 workbenchBrowser=await chromium.connectOverCDP('http://127.0.0.1:9224');workbench=find(workbenchBrowser,'workbench.html?app=workbench');await expect(el).toHaveAttribute('data-connection','online',{timeout:20000});
};
try{
 const originalMotion=await invoke(island,'get_motion_preference'),originalWorkbenchMotion=await invoke(workbench,'get_motion_preference');await invoke(island,'set_motion_preference',{preference:'full'});
 await invoke(workbench,'set_motion_preference',{preference:'reduced'});assert.equal(await invoke(island,'get_motion_preference'),'full');
 await workbench.getByRole('combobox',{name:'实验目标'}).selectOption('preview');
 await invoke(workbench,'simulator_command',{payload:{type:'clinical:reset',targetClientId:(await invoke(workbench,'workbench_status')).clients.find(c=>c.role==='island').clientId}});
 await el.getByRole('button',{name:'打开协作动态'}).click();await expect(el).toHaveAttribute('data-surface','rich');await expect(el).toHaveAttribute('data-motion-phase','settled');await el.getByRole('button',{name:'开始 25 分钟'}).click();
 const deadline=Number(await el.getAttribute('data-timer-deadline'));assert(deadline>Date.now());
 const originalSession=(await invoke(workbench,'workbench_status')).sourceSessionId;
 await invoke(workbench,'qa_exit').catch(()=>{});await closed(9224);await expect(el).toHaveAttribute('data-connection','offline');assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);report.cases.push({name:'graceful workbench exit preserves island timer',pass:true});
 await reattach(restart());assert.notEqual((await invoke(workbench,'workbench_status')).sourceSessionId,originalSession);assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);report.cases.push({name:'restart replaces source session without replacing deadline',pass:true});
 assert.equal(await invoke(workbench,'get_motion_preference'),'reduced');assert.equal(await invoke(island,'get_motion_preference'),'full');report.cases.push({name:'workbench motion enum survives restart without changing island preference',pass:true});await invoke(workbench,'set_motion_preference',{preference:'full'});
 await invoke(workbench,'qa_exit',{abrupt:true}).catch(()=>{});await closed(9224);await expect(el).toHaveAttribute('data-connection','offline');assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);report.cases.push({name:'abrupt workbench termination preserves island timer',pass:true});
 await reattach(restart());assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);assert.equal(await invoke(workbench,'get_motion_preference'),'full');report.cases.push({name:'a replacement workbench motion enum survives abrupt exit',pass:true});await invoke(workbench,'set_motion_preference',{preference:originalWorkbenchMotion});
 await invoke(island,'set_motion_preference',{preference:originalMotion});await invoke(island,'qa_exit').catch(()=>{});await closed(9223);assert((await fetch('http://127.0.0.1:17323/api/health')).ok);report.cases.push({name:'island exit leaves independent workbench running',pass:true});
 report.pass=true;
}finally{
 await writeFile(out+'/lifecycle.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(report.pass)await invoke(workbench,'qa_exit').catch(()=>{});
 await islandBrowser.close().catch(()=>{});await workbenchBrowser.close().catch(()=>{});
}
