// Finite geometry-presentation sample, separate from rAF callback cadence.
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='evidence/uiux-final-20261006';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/clinical.html?view=island'));assert(page);
const post=async data=>assert((await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)})).ok);
await post({type:'clinical:reset'});await page.waitForTimeout(1200);
const sample=page.evaluate(()=>new Promise(resolve=>{
 const rows=[];const start=performance.now();let last=start;
 function tick(now){const el=document.querySelector('[data-testid=clinical-island]');const r=el.getBoundingClientRect();rows.push({t:now-start,dt:now-last,w:r.width,h:r.height,phase:el.dataset.motionPhase,target:Number(el.dataset.targetWidth),hidden:document.hidden});last=now;if(now-start<6500)requestAnimationFrame(tick);else resolve(rows);}requestAnimationFrame(tick);
}));
let i=0;const interval=setInterval(()=>void post({type:'clinical:view',mode:++i%2?'timer':'compact'}),850);
try{
 const rows=await sample;const frames=rows.slice(2),dt=frames.map(r=>r.dt).sort((a,b)=>a-b);
 const moving=frames.filter(r=>r.phase!=='settled'&&Math.abs(r.w-r.target)>1);
 let duplicates=0;for(let j=1;j<frames.length;j++)if(frames[j].phase!=='settled'&&Math.abs(frames[j].w-frames[j].target)>1&&Math.abs(frames[j].w-frames[j-1].w)<.02)duplicates++;
 const result={frames:frames.length,rAFfps:1000/(dt.reduce((a,b)=>a+b,0)/dt.length),p95ms:dt[Math.floor(dt.length*.95)],over25ms:dt.filter(v=>v>25).length,movingSamples:moving.length,unchangedMovingSamples:duplicates,hidden:rows.some(r=>r.hidden),note:'Unchanged geometry samples include finite IPC handoff; this is not DWM presented-frame telemetry',rows};
 await writeFile(out+'/paint-cadence.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rows:undefined}));
}finally{clearInterval(interval);await post({type:'clinical:reset'});await browser.close();}
