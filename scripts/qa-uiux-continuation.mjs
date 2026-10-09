// Read-only observation of the dedicated opt-in prototype WebView. UI inputs use the computer tool.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='evidence/uiux-continuation-20261008';
const ownership=JSON.parse(await readFile(out+'/qa-ownership.json','utf8'));
assert(ownership.verified===true&&ownership.port===9223&&ownership.rootPid>0,'Verified app-owned QA endpoint required');
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const pages=browser.contexts().flatMap(c=>c.pages()).filter(p=>p.url().includes('tauri.localhost/clinical.html?view=island'));
assert.equal(pages.length,1,'One dedicated island WebView required');
const page=pages[0],errors=[];page.on('pageerror',e=>errors.push(e.message));
const call=(command,args={})=>page.evaluate(({command,args})=>window.__TAURI_INTERNALS__.invoke(command,args),{command,args});
try{
 const metrics=await call('clinical_metrics');await call('hover_diagnostics',{clear:true});
 console.log('OBSERVATION_READY: 15 seconds; use physical UI input now');
 const rows=await page.evaluate(()=>new Promise(resolve=>{const rows=[],start=performance.now();let previous=start;
  function tick(now){const e=document.querySelector('[data-testid=clinical-island]'),r=e.getBoundingClientRect(),svg=e.querySelector('.ci-shell');
   rows.push({t:now-start,dt:now-previous,width:r.width,height:r.height,x:r.x,phase:e.dataset.motionPhase,surface:e.dataset.surface,neck:e.dataset.neck,svgHeight:Number(svg.getAttribute('height')),svgWidth:Number(svg.getAttribute('width')),ear:e.dataset.dock==='notch'?10:0,hidden:document.hidden});previous=now;
   if(now-start<15000)requestAnimationFrame(tick);else resolve(rows);
  }requestAnimationFrame(tick);
 }));
 const intervals=rows.slice(2).map(r=>r.dt).sort((a,b)=>a-b),diagnostics=await call('hover_diagnostics',{clear:true});
 const report={ownership,metrics,frames:rows.length,rAFfps:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),p95ms:intervals[Math.floor(intervals.length*.95)],over25ms:intervals.filter(v=>v>25).length,viewportHeightMismatch:rows.filter(r=>Math.abs(r.svgHeight-r.height)>.06).length,neckFrames:rows.filter(r=>r.neck==='true').length,windowChanges:diagnostics.events.filter(e=>e.kind==='clinical-window-change').length,errors,meaning:'rAF cadence and SVG/geometry samples; not DWM presented-frame or 120Hz acceptance',rows,diagnostics};
 await page.screenshot({path:out+'/native-observed.png',omitBackground:true});
 await writeFile(out+'/native-observation.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined,diagnostics:undefined}));
}finally{await browser.close();}
