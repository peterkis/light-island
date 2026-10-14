// Finite, ownership-verified native animation acceptance. Only synthetic source/input.
import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const output=process.env.ISLAND_QA_OUTPUT;assert(output);
const out=resolve(output);
const verification=JSON.parse(execFileSync('powershell',['-NoProfile','-File','scripts/optimization-qa.ps1','-Action','Verify','-Output',output],{encoding:'utf8',windowsHide:true}).replace(/^\uFEFF/,''));assert(verification.verified);
const owner=JSON.parse((await readFile(join(out,'ownership.json'),'utf8')).replace(/^\uFEFF/,''));
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('clinical.html?view=island'));assert(page);
const el=page.getByTestId('clinical-island'),anchor=page.locator('.ci-anchor');
const report={exeSHA256:owner.exeSHA256,transitions:[],hover:[],errors:[],scope:'Actual Windows WebView2 / explicit app full-mode, not a change to Windows preferences'};
page.on('pageerror',e=>report.errors.push(e.message));
const call=(command,args={})=>page.evaluate(({command,args})=>window.__TAURI_INTERNALS__.invoke(command,args),{command,args});
const post=async data=>assert((await fetch(`http://127.0.0.1:${owner.sourcePort??17322}/api/push`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).ok);
const probe=data=>JSON.parse(execFileSync('python',['scripts/hover-win32-probe.py',JSON.stringify(data)],{encoding:'utf8',windowsHide:true}));
const original=probe({op:'snapshot'}).cursor;
const settled=async surface=>{if(surface)await expect(el).toHaveAttribute('data-surface',surface);await expect(el).toHaveAttribute('data-motion-phase','settled',{timeout:12000});await page.waitForTimeout(380);};
async function sample(){await page.evaluate(()=>{window.__RESTORE_SAMPLE__=new Promise(resolve=>{let raf=0,done=false;const data=[],start=performance.now();const finish=()=>{if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(timeout);resolve(data);};const tick=t=>{const e=document.querySelector('[data-testid=clinical-island]'),r=e.getBoundingClientRect(),s=e.querySelector('.ci-shell'),c=e.querySelector('.ci-content'),css=getComputedStyle(c);data.push({t:t-start,w:r.width,h:r.height,center:r.x+r.width/2,y:r.y,svgH:Number(s.getAttribute('height')),svgW:Number(s.getAttribute('width')),phase:e.dataset.motionPhase,epoch:e.dataset.layoutEpoch,velocity:Number(e.dataset.velocityX),scale:new DOMMatrixReadOnly(css.transform).a,blur:css.filter,opacity:Number(css.opacity),hidden:document.hidden});if(t-start>1800)finish();else raf=requestAnimationFrame(tick);};const timeout=setTimeout(finish,2200);raf=requestAnimationFrame(tick);});});}
async function realClick(button){const b=await button.boundingBox();assert(b);const w=probe({op:'snapshot'}),d=w.dpi/96;probe({op:'move',x:Math.round(w.rect[0]+(b.x+b.width/2)*d),y:Math.round(w.rect[1]+(b.y+b.height/2)*d),steps:8,delay:.012});assert.equal(probe({op:'snapshot'}).hitRoot,w.hwnd,'Only click inside the owned island');probe({op:'click'});}
try{
 await settled();report.platformBefore=await call('clinical_platform_status');report.preferenceBefore=await call('get_motion_preference');
 await call('set_motion_preference',{preference:'system'});await expect(anchor).toHaveAttribute('data-motion-preference','system');
 report.systemEffective=await anchor.getAttribute('data-motion');report.systemReason=await anchor.getAttribute('data-motion-reason');
 await call('set_motion_preference',{preference:'full'});await post({type:'clinical:reset'});await post({type:'clinical:configure',settings:{reduced:false,autoPreview:false,privacy:false,role:'clinician'}});await expect(anchor).toHaveAttribute('data-motion','full');
 probe({op:'move',x:40,y:700});const foreground=probe({op:'snapshot'}).foreground;
 await post({type:'clinical:scenario',scenario:'S03',stage:0});await settled('rich');assert.equal(await el.getAttribute('data-hidden'),'false','System privacy/presentation prevents visual acceptance');
 const afterPush=probe({op:'snapshot'});report.focusObservation={before:foreground,after:afterPush.foreground,island:afterPush.hwnd,controlled:false};report.preservesPushFocus=afterPush.foreground===foreground;assert(afterPush.foreground!==afterPush.hwnd||foreground===afterPush.hwnd,'The notification acquired foreground focus');
 const baseline=probe({op:'snapshot'});report.baseline=baseline;await call('hover_diagnostics',{clear:true});
 for(const mode of ['compact','open','compact','open']){
  await sample();await post({type:'clinical:view',mode,scenario:'S03'});const rows=await page.evaluate(()=>window.__RESTORE_SAMPLE__);await settled(mode==='open'?'rich':'compact');
  assert(rows.length>30&&rows.every(r=>!r.hidden));assert.deepEqual(probe({op:'snapshot'}).rect,baseline.rect);
  const moving=rows.filter(r=>['expanding','collapsing'].includes(r.phase)),unique=new Set(moving.map(r=>r.w.toFixed(2))).size;
  assert(unique>12,'The full native surface must actually move, not only rAF callbacks');assert(rows.every(r=>Math.abs(r.h-r.svgH)<.15&&Math.abs(r.svgW-r.w-20)<.15));
  assert(Math.max(...rows.map(r=>r.center))-Math.min(...rows.map(r=>r.center))<1);
  const intervals=rows.slice(1).map((r,i)=>r.t-rows[i].t).sort((a,b)=>a-b);
  report.transitions.push({mode,frames:rows.length,uniqueMovingWidths:unique,fullContentScaleObserved:rows.some(r=>r.scale<.995&&r.opacity>.05),blurObserved:rows.some(r=>r.blur.startsWith('blur(')&&r.blur!=='blur(0px)'&&r.opacity>.05),p95RafMs:intervals[Math.floor(intervals.length*.95)],over25ms:intervals.filter(t=>t>25).length,rows});
 }
 const diag=await call('hover_diagnostics',{clear:true});report.hwndChanges=diag.events.filter(e=>e.kind==='clinical-window-change').length;report.regionUpdates=diag.events.filter(e=>e.kind==='clinical-layout').length;assert.equal(report.hwndChanges,0);
 assert(report.transitions.some(t=>t.mode==='open'&&t.fullContentScaleObserved&&t.blurObserved));
 await page.screenshot({path:join(out,'restored-rich.png'),omitBackground:true});
 await post({type:'clinical:view',mode:'compact'});await settled('compact');
 for(const side of ['left','right','bottom']){
  probe({op:'move',x:40,y:700});await page.waitForTimeout(1300);await settled('compact');
  const b=await el.boundingBox(),w=probe({op:'snapshot'}),d=w.dpi/96;assert(b);const x=side==='left'?b.x+2:side==='right'?b.x+b.width-2:b.x+b.width/2;const y=side==='bottom'?b.y+b.height-2:b.y+14;
  const point={x:Math.round(w.rect[0]+x*d),y:Math.round(w.rect[1]+y*d)};
  await call('hover_diagnostics',{clear:true});const arrived=probe({op:'move',...point,steps:16,delay:.02});await page.waitForTimeout(1300);await settled('compact');const epoch=await el.getAttribute('data-layout-epoch');
  const holds=probe({op:'hold',seconds:5});assert(holds.every(r=>JSON.stringify(r.rect)===JSON.stringify(baseline.rect)&&r.cursor[0]===arrived.cursor[0]&&r.cursor[1]===arrived.cursor[1]));
  assert.equal(await el.getAttribute('data-layout-epoch'),epoch,'Stationary pointer must not restart animation');
  report.hover.push({side,point,actualCursor:arrived.cursor,samples:holds.length,stableEpoch:true,stableHWND:true});
 }
 probe({op:'move',x:40,y:700});await page.waitForTimeout(1300);await settled('compact');
 await realClick(el.getByRole('button',{name:'展开协作详情'}));await settled('rich');await realClick(el.getByRole('button',{name:'收起协作详情'}));probe({op:'move',x:40,y:700});await settled('compact');report.realClicks=2;
 await call('set_motion_preference',{preference:'reduced'});await expect(anchor).toHaveAttribute('data-motion','reduced');await post({type:'clinical:view',mode:'open',scenario:'S03'});await settled('rich');
 const style=await el.locator('.ci-content').evaluate(e=>({filter:getComputedStyle(e).filter,transform:getComputedStyle(e).transform,inert:e.inert}));assert.deepEqual(style,{filter:'none',transform:'none',inert:false});report.reducedLiveSwitch=true;
 await call('set_motion_preference',{preference:'full'});await expect(anchor).toHaveAttribute('data-motion','full');await settled('rich');
 report.preferenceAfter=await call('get_motion_preference');report.platformAfter=await call('clinical_platform_status');assert.equal(report.platformAfter.animationsEnabled,report.platformBefore.animationsEnabled);assert.equal(report.preferenceAfter,'full');
 await page.waitForTimeout(1200);await call('hover_diagnostics',{clear:true});const n=await el.evaluate(e=>new Promise(resolve=>{let n=0;const o=new MutationObserver(r=>n+=r.length);o.observe(e,{subtree:true,attributes:true,childList:true});setTimeout(()=>{o.disconnect();resolve(n);},800);}));report.restDOMMutations=n;
 const rest=await call('hover_diagnostics',{clear:true});report.restRegionUpdates=rest.events.filter(e=>e.kind==='clinical-layout').length;assert.equal(report.restRegionUpdates,0);assert.equal(n,0);
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);process.exitCode=1;}
finally{probe({op:'move',x:original[0],y:original[1]});await writeFile(join(out,'motion-restored-native-verified.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,transitions:report.transitions.map(({rows,...rest})=>rest)},null,2));await browser.close();}
