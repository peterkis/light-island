// Finite regression against the explicitly owned --qa-cdp instance only.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const [ownershipPath,output]=process.argv.slice(2);
const ownership=JSON.parse(await readFile(ownershipPath,'utf8'));
assert(ownership.verified===true&&ownership.port===9223&&ownership.rootPid>0);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
try{
 const pages=browser.contexts().flatMap(c=>c.pages());
 const island=pages.find(p=>p.url().includes('clinical.html?view=island'));
 assert(island,'Owned island WebView required');
 const post=async(data)=>{const response=await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});assert(response.ok);};
 await post({type:'clinical:reset'});
 await island.waitForFunction(()=>document.querySelector('[data-testid=clinical-island]')?.dataset.labState==='idle');
 const before=await island.evaluate(()=>document.hasFocus());
 await post({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
 await post({type:'clinical:view',mode:'open',scenario:'S04'});
 await island.waitForFunction(()=>document.querySelector('[data-testid=clinical-island]')?.dataset.labState==='sum'&&document.querySelectorAll('.lab-chip').length>0);
 const result={ownership,islandFocusedBefore:before,islandFocusedAfter:await island.evaluate(()=>document.hasFocus()),summaryLoaded:true,meaning:'DOM focus diagnostics only; the PowerShell wrapper measures actual Win32 foreground ownership'};
 await writeFile(output,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}finally{await browser.close();}
