// Only newly owned Samewave QA profiles. Never attach an existing browser.
import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT;
assert(out?.startsWith('evidence/app-split-20261013/'));
const owner=JSON.parse((await readFile(out+'/ownership.json','utf8')).replace(/^\uFEFF/,''));
const verify=()=>JSON.parse(execFileSync('powershell',['-NoProfile','-File','scripts/app-split-qa.ps1','-Action','Verify','-Output',out],{encoding:'utf8',windowsHide:true}).replace(/^\uFEFF/,''));
assert(verify().verified);const source=`http://127.0.0.1:${owner.sourcePort}`;
const islandBrowser=await chromium.connectOverCDP('http://127.0.0.1:9223'),workbenchBrowser=await chromium.connectOverCDP('http://127.0.0.1:9224');
const select=(browser,path)=>{const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/'+path));assert(page,'Expected owned application URL');return page;};
const island=select(islandBrowser,'clinical.html?view=island'),workbench=select(workbenchBrowser,'workbench.html?app=workbench');
const invoke=(page,cmd,args={})=>page.evaluate(({cmd,args})=>window.__TAURI_INTERNALS__.invoke(cmd,args),{cmd,args});
const el=island.getByTestId('clinical-island'),preview=workbench.getByTestId('clinical-island');
const report={pass:false,scope:'Windows owned release applications; rAF cadence and screen continuity are separate'};
const settle=async(surface)=>{if(surface)await expect(el).toHaveAttribute('data-surface',surface);await expect(el).toHaveAttribute('data-motion-phase','settled',{timeout:12000});};
const post=async(data)=>{const response=await fetch(source+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert(response.ok,await response.text());};
try{
 report.workbenchMotion=await invoke(workbench,'get_motion_preference');
 await workbench.getByRole('combobox',{name:'实验目标'}).selectOption('preview');
 const setup=await invoke(workbench,'workbench_status'),desktopId=setup.clients.find(c=>c.role==='island')?.clientId;assert(desktopId);await invoke(workbench,'simulator_command',{payload:{type:'experiment:dispatch',requestId:crypto.randomUUID(),targetClientId:desktopId,action:{kind:'personal',command:'end'}}});await invoke(workbench,'simulator_command',{payload:{type:'experiment:dispatch',requestId:crypto.randomUUID(),targetClientId:desktopId,action:{kind:'view',mode:'compact'}}});for(const targetClientId of ['preview',desktopId])await invoke(workbench,'simulator_command',{payload:{type:'clinical:reset',targetClientId}});
 await expect(el).toHaveAttribute('data-connection','online');await expect(preview).toHaveAttribute('data-connection','online');await settle('idle');
 report.motion=await invoke(island,'get_motion_preference');await invoke(island,'set_motion_preference',{preference:'full'});
 await el.locator('.ux-idle-button').hover();await island.waitForTimeout(1100);
 report.s0=await el.evaluate(e=>{const b=e.querySelector('.ux-idle-button'),r=e.getBoundingClientRect();return {width:r.width,height:r.height,background:getComputedStyle(b).backgroundColor,cursor:getComputedStyle(b).cursor,fill:getComputedStyle(e.querySelector('.ci-fill')).fill,mark:e.querySelector('.ux-idle-mark')?getComputedStyle(e.querySelector('.ux-idle-mark')).opacity:'0'};});
 assert.deepEqual(report.s0,{width:124,height:32,background:'rgba(0, 0, 0, 0)',cursor:'pointer',fill:'rgb(0, 0, 0)',mark:'0'});
 await island.screenshot({path:out+'/island-s0.png',omitBackground:true});
 const status=await invoke(workbench,'workbench_status'),client=status.clients.find(c=>c.role==='island');assert(client);
 report.status=status;const target=workbench.getByRole('combobox',{name:'实验目标'});
 await el.getByRole('button',{name:'打开协作动态'}).click();await settle('rich');await el.getByRole('button',{name:'开始 25 分钟'}).click();
 const deadline=Number(await el.getAttribute('data-timer-deadline'));assert(deadline>Date.now());report.timerDeadline=deadline;
 await workbench.getByTestId('clinical-scenario-S03').click();await expect(preview).toHaveAttribute('data-surface',/^(alert|rich)$/);
 assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);assert.equal(await el.getAttribute('data-surface'),'rich');
 await workbench.getByRole('button',{name:'重置本地模拟场景'}).click();assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);
 await target.selectOption(client.clientId);await workbench.getByTestId('clinical-scenario-S03').click();await settle('rich');assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);
 await workbench.getByRole('button',{name:'重置本地模拟场景'}).click();assert.equal(Number(await el.getAttribute('data-timer-deadline')),deadline);
 await post({type:'clinical:view',mode:'timer'});await settle('rich');await el.getByRole('button',{name:'结束本次'}).click();await post({type:'clinical:view',mode:'compact'});await settle('idle');
 await post({type:'clinical:configure',settings:{autoPreview:true}});await post({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});await expect(el).toHaveAttribute('data-lab-state','alert');await settle();
 await el.getByRole('button',{name:'查看检验报告摘要'}).click();await expect(el).toHaveAttribute('data-lab-state','sum');await settle();await expect(el.getByRole('button',{name:'阅读报告',exact:true})).toBeEnabled();await el.getByRole('button',{name:'阅读报告',exact:true}).click();await expect(el).toHaveAttribute('data-lab-state','read');await settle();await expect(el.locator('.lab-row')).toHaveCount(8);
 await post({type:'clinical:configure',settings:{privacy:true}});await expect(el.locator('.lab-row')).toHaveCount(0);await expect(el).not.toContainText('张**');
 await post({type:'clinical:reset'});await settle('idle');await invoke(island,'set_motion_preference',{preference:'reduced'});await post({type:'clinical:view',mode:'timer'});await settle('rich');report.reduced=await island.locator('.ci-anchor').getAttribute('data-motion');assert.equal(report.reduced,'reduced');
 await invoke(island,'set_motion_preference',{preference:report.motion});await post({type:'clinical:view',mode:'compact'});await settle('idle');
 await workbench.screenshot({path:out+'/workbench.png',fullPage:true});report.pass=true;
}finally{
 if(report.motion)await invoke(island,'set_motion_preference',{preference:report.motion}).catch(()=>{});
 if(report.workbenchMotion)await invoke(workbench,'set_motion_preference',{preference:report.workbenchMotion}).catch(()=>{});
 await writeFile(out+'/native-apps.json',JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,s0:report.s0,timerDeadline:report.timerDeadline,reduced:report.reduced}));
 // Keep both owned applications for the screen and lifecycle phases.
 await islandBrowser.close();await workbenchBrowser.close();
}
