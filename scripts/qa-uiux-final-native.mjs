// Dedicated QA WebView only; synthetic source and finite sampling. No clinical systems.
import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT||'evidence/uiux-final-20261006';
const post=async data=>assert((await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).ok);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/clinical.html?view=island'));
assert(page,'Not the dedicated clinical island WebView');const p=page.getByTestId('clinical-island');
const call=(cmd,args)=>page.evaluate(({cmd,args})=>window.__TAURI_INTERNALS__.invoke(cmd,args),{cmd,args});
const probe=a=>JSON.parse(execFileSync('python',['scripts/hover-win32-probe.py',JSON.stringify(a)],{encoding:'utf8'}));
const original=probe({op:'snapshot'}).cursor;
const errors=[],report={platform:'Windows / native WebView2 / continuous U-notch motion',transitions:[],errors};page.on('pageerror',e=>errors.push(e.message));
const settled=async(view)=>{if(view)await expect(p).toHaveAttribute('data-view',view);await expect(p).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(260);};
try{
 probe({op:'move',x:40,y:140});await post({type:'clinical:reset'});await settled('idle');
 const baseline=probe({op:'snapshot'});report.baseline=baseline;report.metrics=await call('clinical_metrics',{});
 await page.screenshot({path:out+'/native-idle.png',omitBackground:true});
 for(const payload of [{type:'ack',id:'none'},{type:'clinical:configure',settings:{role:'finance'}},{type:'clinical:scenario',scenario:'S03',stage:0}]){
  let denied=false;try{await call('send_wire',{payload});}catch{denied=true;}assert(denied,'Clinical island must not accept clinical writes or simulator authority');
 }
 report.clinicalWriteAndSimulatorDenied=true;
 await post({type:'clinical:scenario',scenario:'S03',stage:0});await post({type:'clinical:view',mode:'compact'});await settled('compact');
 for(let i=0;i<4;i++){
  await call('hover_diagnostics',{clear:true});
  const box=await p.boundingBox(),r=probe({op:'snapshot'}),scale=r.dpi/96;
  probe({op:'move',x:Math.round(r.rect[0]+(box.x+box.width/2)*scale),y:Math.round(r.rect[1]+(box.y+box.height/2)*scale),steps:12,delay:.01});
  const hold=probe({op:'hold',seconds:.35});assert(hold.every(v=>JSON.stringify(v.rect)===JSON.stringify(baseline.rect)));
  assert.equal(probe({op:'snapshot'}).hitRoot,r.hwnd,'Input target must be the island');probe({op:'click'});await settled('expanded');
  const expanded=await p.boundingBox();assert(expanded.height<=480);assert.equal(expanded.y,0);
  await page.screenshot({path:out+`/native-expanded-${i===0?'sample':'latest'}.png`,omitBackground:true});
  const close=await p.getByRole('button',{name:'收起协作详情'}).boundingBox();assert(close);
  const current=probe({op:'snapshot'});probe({op:'move',x:Math.round(current.rect[0]+(close.x+close.width/2)*scale),y:Math.round(current.rect[1]+(close.y+close.height/2)*scale)});
  assert.equal(probe({op:'snapshot'}).hitRoot,r.hwnd);probe({op:'click'});await settled('compact');
  const diag=await call('hover_diagnostics',{clear:true}),changes=diag.events.filter(e=>e.kind==='clinical-window-change'),regions=diag.events.filter(e=>e.kind==='clinical-layout'&&!e.detail.equalRegion);
  assert.equal(changes.length,0);assert(regions.length>8&&regions.length<500,'Finite continuous outline updates, not instant geometry or unbounded polling');assert.deepEqual(probe({op:'snapshot'}).rect,baseline.rect);
  report.transitions.push({iteration:i,expanded,regionChanges:regions.length,windowChanges:changes.length});
 }
 await p.getByRole('button',{name:'展开协作详情'}).click();await settled('expanded');
 await p.getByRole('button',{name:'打开危急值流程'}).click();await page.waitForTimeout(1200);
 const source=browser.contexts().flatMap(c=>c.pages()).find(x=>x.url().includes('clinical.html?source='));
 if(source){await expect(source.getByRole('heading',{level:1})).toHaveText('检验危急值已发布');await expect(source.locator('.cs-source')).toContainText('DEMO-S03');await source.screenshot({path:out+'/native-source.png'});report.sourceOpenedExactObject=true;await source.getByRole('button',{name:'返回灵动岛'}).click();}else{report.sourceOpenedExactObject='NOT_RUN: source WebView not enumerated over dedicated CDP';}
 await post({type:'clinical:reset'});await settled('idle');
 const count=await p.evaluate(e=>new Promise(resolve=>{let n=0;const o=new MutationObserver(r=>n+=r.length);o.observe(e,{attributes:true,subtree:true,childList:true});setTimeout(()=>{o.disconnect();resolve(n);},700);}));report.idleMutations=count;assert.equal(count,0);
 let n=0;const timer=setInterval(()=>void post({type:'clinical:view',mode:++n%2?'timer':'compact'}),800);
 try{report.frameCadence=await page.evaluate(()=>new Promise(resolve=>{const a=[];const start=performance.now();let last=start;const tick=now=>{a.push(now-last);last=now;if(now-start<6000)requestAnimationFrame(tick);else{const b=a.slice(2).sort((x,y)=>x-y);resolve({frames:b.length,averageFps:1000/(b.reduce((s,x)=>s+x,0)/b.length),p95ms:b[Math.floor(b.length*.95)],over25ms:b.filter(x=>x>25).length,visible:!document.hidden});}};requestAnimationFrame(tick);}));}finally{clearInterval(timer);}
 assert.deepEqual(errors,[]);report.pass=true;
}finally{await post({type:'clinical:reset'});probe({op:'move',x:original[0],y:original[1]});await writeFile(out+'/native-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
