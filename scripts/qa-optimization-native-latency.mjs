// Finite repeated renderer-ready observations; excludes DWM presentation claims.
import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT;assert(out,'Owned QA output directory required');
const verified=JSON.parse(execFileSync('powershell',['-NoProfile','-File','scripts/optimization-qa.ps1','-Action','Verify','-Output',out],{encoding:'utf8'}).replace(/^\uFEFF/,''));assert(verified.verified);
const owner=JSON.parse((await readFile(join(out,'ownership.json'),'utf8')).replace(/^\uFEFF/,''));
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('clinical.html?view=island'));assert(page);
const island=page.getByTestId('clinical-island'),rows=[];
const post=async data=>assert((await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).ok);
try{
 for(let round=0;round<7;round++){
  await post({type:'clinical:reset'});await expect(island).toHaveAttribute('data-surface','idle');await expect(island).toHaveAttribute('data-motion-phase','settled');
  await page.evaluate(()=>{
   window.__OPT_LATENCY__=new Promise(resolve=>{
    const start=performance.now();let frames=0,raf=0,done=false;
    const finish=timedOut=>{if(done)return;done=true;clearTimeout(timeout);cancelAnimationFrame(raf);resolve({ms:performance.now()-start,frames,timedOut});};
    const tick=()=>{if(done)return;frames++;const host=document.querySelector('[data-testid="clinical-island"]'),content=host.querySelector('.ci-content');if(host.dataset.surface==='rich'&&host.dataset.motionPhase==='settled'&&!content.inert&&Number(getComputedStyle(content).opacity)>=.95)finish(false);else raf=requestAnimationFrame(tick);};
    const timeout=setTimeout(()=>finish(true),5000);raf=requestAnimationFrame(tick);
   });
  });
  await post({type:'clinical:scenario',scenario:'S03',stage:0});
  const sample=await page.evaluate(()=>window.__OPT_LATENCY__);assert(!sample.timedOut);rows.push(sample);
 }
 const sorted=rows.map(r=>r.ms).sort((a,b)=>a-b);
 const result={exeSHA256:owner.exeSHA256,rows,medianMs:sorted[3],minMs:sorted[0],maxMs:sorted.at(-1),scope:'Seven warm renderer observations, including loopback dispatch and next-rAF sampling; rich phase settled, content interactive and opacity >= .95; not cold startup or DWM presentation'};
 await writeFile(join(out,'notification-latency.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
