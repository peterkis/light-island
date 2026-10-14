import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import WebSocket from 'ws';
import assert from 'node:assert/strict';
const out='evidence/app-split-20261013/legacy-native';
const owner=JSON.parse((await readFile(out+'/ownership.json','utf8')).replace(/^\uFEFF/,''));
execFileSync('powershell',['-NoProfile','-Command',`$p=Get-Process -Id ${owner.rootPid};if($p.Path -ne '${owner.executable}' -or $p.StartTime.ToUniversalTime().Ticks -ne [long]'${owner.startedTicks}'){throw 'Legacy identity changed'};$source=Get-NetTCPConnection -LocalPort 17321 -State Listen;if($source.OwningProcess -ne ${owner.rootPid}){throw 'Legacy source ownership changed'}`],{windowsHide:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/index.html?app=workbench'));assert(page);
const report={pass:false};let socket;
try{
 await expect(page.getByTestId('scenario-critical')).toBeVisible();
 socket=new WebSocket('ws://127.0.0.1:17321/events');let notice,receipt;
 socket.on('message',raw=>{const value=JSON.parse(raw.toString());if(value.type==='notice')notice=value.notice;if(value.type==='receipt')receipt=value;});
 await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});
 await page.getByTestId('scenario-critical').click();await expect.poll(()=>notice?.priority).toBe('critical');
 const at=Date.now();socket.send(JSON.stringify({type:'ack',id:notice.id,revision:notice.revision,ackId:'owned-legacy-test'}));await expect.poll(()=>receipt?.kind).toBe('received-not-treated');assert.equal(receipt.revision,notice.revision);assert(receipt.receivedAt>=at+650);
 report.pass=true;report.receipt={revision:receipt.revision,kind:receipt.kind,delayMs:receipt.receivedAt-at};
}finally{
 socket?.close();await writeFile(out+'/legacy.json',JSON.stringify(report,null,2));await page.evaluate(()=>window.__TAURI_INTERNALS__.invoke('qa_exit')).catch(()=>{});await browser.close().catch(()=>{});console.log(JSON.stringify(report));
}
