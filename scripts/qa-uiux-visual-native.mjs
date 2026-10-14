// Only a process-verified, --qa-cdp Samewave WebView; finite visual regression.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT??'evidence/uiux-refinement-20261013/native-red';
await mkdir(out,{recursive:true});
const owner=JSON.parse((await readFile(out+'/ownership.json','utf8')).replace(/^\uFEFF/,''));
assert(owner.verified&&[17322,17323].includes(owner.sourcePort??17322),'Verified isolated native QA session required');
const source=`http://127.0.0.1:${owner.sourcePort??17322}`;
const verification=JSON.parse(execFileSync('powershell',['-NoProfile','-File','scripts/optimization-qa.ps1','-Action','Verify','-Output',out],{encoding:'utf8',windowsHide:true}).replace(/^\uFEFF/,''));
assert(verification.verified);
const windows=JSON.parse(execFileSync('python',['-X','utf8','-B','scripts/inspect-uiux-native.py'],{encoding:'utf8'}));
const win=windows.find(w=>w.title==='Samewave Island');
assert(win?.path.toLowerCase().endsWith('island-protype\\src-tauri\\target\\release\\samewave-island.exe'),'Expected repository release HWND');
assert.equal(win.pid,owner.rootPid,'QA HWND must belong to the newly owned test process');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/clinical.html?view=island'));
assert(page,'Expected QA clinical island, never an unrelated profile');
const report={windows,pass:false};
try{
 const post=async(data)=>assert((await fetch(source+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).ok);
 await post({type:'clinical:reset'});
 const island=page.getByTestId('clinical-island');
 await expect(island).toHaveAttribute('data-motion-phase','settled');
 report.idle=await island.evaluate(e=>({box:{width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height},rim:getComputedStyle(e.querySelector('.ci-rim')).stroke,fill:getComputedStyle(e.querySelector('.ci-fill')).fill}));
 await page.screenshot({path:out+'/idle-webview.png',omitBackground:true});
 await island.locator('.ux-idle-button').hover();await page.waitForTimeout(1100);
 report.hover=await island.evaluate(e=>{const b=e.querySelector('.ux-idle-button'),mark=e.querySelector('.ux-idle-mark');return {width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,background:getComputedStyle(b).backgroundColor,cursor:getComputedStyle(b).cursor,markOpacity:mark?getComputedStyle(mark).opacity:'0'};});
 await page.screenshot({path:out+'/hover-webview.png',omitBackground:true});
 report.violations=[];
 if((Number(win.style)&0x00c40000)!==0)report.violations.push('Native WS_CAPTION/WS_THICKFRAME border');
 if(report.hover.background!=='rgba(0, 0, 0, 0)')report.violations.push('S0 hover paints a grey background');
 if(report.hover.markOpacity!=='0')report.violations.push('S0 hover reveals a grey mark');
 if(report.hover.width!==124||report.hover.height!==32)report.violations.push('S0 hover changes geometry');
 report.pass=report.violations.length===0;
 assert(report.pass,report.violations.join('; '));
}finally{
 await writeFile(out+'/visual-native.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));await browser.close();
}
