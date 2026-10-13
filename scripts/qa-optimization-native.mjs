// Dedicated, ownership-verified synthetic QA. No unrelated browser/profile is attached.
import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const output=process.env.ISLAND_QA_OUTPUT;
assert(output,'ISLAND_QA_OUTPUT must name a fresh QA session');
const out=resolve(output);
const reportName=process.env.ISLAND_QA_REPORT_NAME??'native-observation';assert(/^[a-z0-9-]+$/.test(reportName));
const verification=JSON.parse(execFileSync('powershell',['-NoProfile','-File','scripts/optimization-qa.ps1','-Action','Verify','-Output',output],{encoding:'utf8'}).replace(/^\uFEFF/,''));
assert(verification.verified&&verification.port===9223);
const owner=JSON.parse((await readFile(join(out,'ownership.json'),'utf8')).replace(/^\uFEFF/,''));
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('clinical.html?view=island'));
assert(page,'Owned clinical island WebView is required');
const island=page.getByTestId('clinical-island');
const errors=[],report={ownership:verification,exeSHA256:owner.exeSHA256,errors,transitions:[],scope:'Finite QA at this machine DPI; rAF and SVG samples are not DWM-presented frames'};
page.on('pageerror',error=>errors.push(error.message));
const post=async data=>assert((await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).ok);
const invoke=(command,args={})=>page.evaluate(({command,args})=>window.__TAURI_INTERNALS__.invoke(command,args),{command,args});
const probe=()=>JSON.parse(execFileSync('python',['scripts/hover-win32-probe.py',JSON.stringify({op:'snapshot'})],{encoding:'utf8'}));
try{
 await expect(island).toHaveAttribute('data-motion-phase','settled',{timeout:15000});
 report.metrics=await invoke('clinical_metrics');report.platform=await invoke('clinical_platform_status');report.initialHidden=await island.getAttribute('data-hidden');report.motionPath=report.platform.animationsEnabled?'normal':'system-reduced-motion';
 await post({type:'clinical:reset'});await post({type:'clinical:configure',settings:{privacy:false,locked:false,fullscreen:false,role:'clinician',reduced:false,textScale:1}});
 const foreground=probe().foreground;
 const notificationStarted=performance.now();await post({type:'clinical:scenario',scenario:'S03',stage:0});await expect(island).toHaveAttribute('data-surface','rich');await expect(island).toHaveAttribute('data-motion-phase','settled');report.notificationToSettledMs=performance.now()-notificationStarted;
 report.notificationPreservesForeground=probe().foreground===foreground;assert(report.notificationPreservesForeground,'A source notification acquired foreground focus');
 report.visibleImportant=await island.getAttribute('data-hidden')==='false';
 assert(report.visibleImportant,'OS presentation/privacy state blocks the important source; native visual QA cannot pass');
 const rectangle=probe().rect;
 await invoke('hover_diagnostics',{clear:true});
 for(const mode of ['compact','open','compact','open']){
  await page.evaluate(()=>{
   window.__OPT_NATIVE_SAMPLE__=new Promise(resolve=>{
    const rows=[],start=performance.now();let raf=0,done=false;
    const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(timeout);resolve(rows);};
    const tick=time=>{if(done)return;const e=document.querySelector('[data-testid="clinical-island"]'),svg=e.querySelector('.ci-shell'),r=e.getBoundingClientRect();rows.push({t:time-start,width:r.width,height:r.height,svgWidth:Number(svg.getAttribute('width')),svgHeight:Number(svg.getAttribute('height')),ear:e.dataset.dock==='notch'?10:0,phase:e.dataset.motionPhase,hidden:document.hidden});if(time-start>=1400)finish();else raf=requestAnimationFrame(tick);};
    const timeout=setTimeout(finish,1800);raf=requestAnimationFrame(tick);
   });
  });
  await post({type:'clinical:view',mode,scenario:'S03'});
  const rows=await page.evaluate(()=>window.__OPT_NATIVE_SAMPLE__);await expect(island).toHaveAttribute('data-motion-phase','settled');
  assert(rows.length>2&&rows.every(r=>!r.hidden),'Insufficient visible rAF samples; no native presentation claim is possible');
  const after=probe();assert.deepEqual(after.rect,rectangle,'HWND moved during an ordinary transition');
  const mismatch=rows.filter(r=>Math.abs(r.svgHeight-r.height)>.15||Math.abs(r.svgWidth-r.width-2*r.ear)>.15);
  assert.equal(mismatch.length,0,'SVG viewport diverged from the painted shell');
  const intervals=rows.slice(1).map((row,i)=>row.t-rows[i].t).sort((a,b)=>a-b);
  report.transitions.push({mode,frames:rows.length,p95RafMs:intervals[Math.floor(intervals.length*.95)]??null,viewportMismatch:mismatch.length,rectangle:after.rect,rows});
 }
 const diagnostics=await invoke('hover_diagnostics',{clear:true});
 report.windowChanges=diagnostics.events.filter(e=>e.kind==='clinical-window-change').length;
 report.regionUpdates=diagnostics.events.filter(e=>e.kind==='clinical-layout').length;
 assert.equal(report.windowChanges,0);assert(report.regionUpdates>0&&report.regionUpdates<1000);
 await page.waitForTimeout(700);const idle=await invoke('hover_diagnostics',{clear:true});report.restRegionUpdates=idle.events.filter(e=>e.kind==='clinical-layout').length;assert.equal(report.restRegionUpdates,0);
 for(const payload of [{type:'ack',id:'x'},{type:'clinical:configure',settings:{role:'finance'}},{type:'clinical:scenario',scenario:'S03'}]){
  let denied=false;try{await invoke('send_wire',{payload});}catch{denied=true;}assert(denied,'Island accepted a simulator or acknowledgement command');
 }
 report.readonlyBoundary=true;
 const started=performance.now();await island.getByRole('button',{name:'打开危急值流程'}).click();
 let source;
 try{await expect.poll(()=>{source=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('clinical.html?source='));return Boolean(source);},{timeout:2500}).toBe(true);}catch{/* A separate WebView2 environment may not be exposed by this CDP endpoint. */}
 if(source){
  await expect(source.getByRole('heading',{level:1})).toHaveText('检验危急值已发布');await expect(source.getByRole('dialog')).toContainText('DEMO-S03');
  report.sourceVisibleMs=performance.now()-started;
  report.sourceNavigation=await source.evaluate(()=>performance.getEntriesByType('navigation').map(entry=>({domContentLoadedMs:entry.domContentLoadedEventEnd,loadMs:entry.loadEventEnd})));
  await source.screenshot({path:join(out,reportName+'-source.png')});
 }else{
  report.sourceContentTiming='NOT_RUN: source WebView is not enumerated by the owned CDP endpoint';
  report.sourceWindow=JSON.parse(execFileSync('python',['scripts/inspect-optimization-window.py',JSON.stringify({pid:owner.rootPid,capture:join(out,reportName+'-source.png')})],{encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'}}));
  assert(report.sourceWindow.windows.some(w=>w.title.startsWith('模拟来源边界')&&w.visible),'Owned source window did not open');
 }
 await page.screenshot({path:join(out,reportName+'-island.png'),omitBackground:true});
 assert.deepEqual(errors,[]);report.status=source?'PASS':'PASS_WITH_LIMITED_SOURCE_OBSERVATION';
}catch(error){report.status='FAIL';report.failure=String(error);process.exitCode=1;}
finally{
 await writeFile(join(out,reportName+'.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,transitions:report.transitions.map(({rows,...rest})=>rest)},null,2));
 await browser.close();
}
