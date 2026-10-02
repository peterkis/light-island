// Negative IPC cases and interrupted-message geometry on our dedicated native WebView only.
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('tauri.localhost') && p.url().includes('view=island'));
assert(page, 'Dedicated native island not found');
const call = (cmd, args) => page.evaluate(({cmd,args}) => window.__TAURI_INTERNALS__.invoke(cmd,args), {cmd,args});
const post = async data => { assert((await fetch('http://127.0.0.1:17321/api/push', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data)})).ok); };
const probe = value => JSON.parse(execFileSync('python',['scripts/hover-win32-probe.py',JSON.stringify(value)],{encoding:'utf8'}));
const original = probe({op:'snapshot'}).cursor;
const result = {staleRequests:[], transitions:[]};
const pill = page.getByTestId('island');
try {
 probe({op:'move',x:40,y:140}); await post({type:'reset'});
 await post({type:'configure',settings:{engine:'gsap',shape:'notch',reduced:false}});
 await expect(pill).toHaveAttribute('data-mode','compact'); await expect(pill).toHaveAttribute('data-motion-phase','settled');
 const epoch = Number(await pill.getAttribute('data-motion-epoch'));
 const before = probe({op:'snapshot'}); await call('hover_diagnostics',{clear:true});
 const outline={width:160,height:34,points:[[0,0],[160,0],[160,34],[0,34]]};
 for(const [command,args] of [
  ['resize_island_window',{epoch:epoch-1,width:500,height:70}],
  ['commit_island_geometry',{epoch:epoch-1,...outline,canvasWidth:500,canvasHeight:70}],
  ['resize_island_window',{epoch,width:500,height:70}],
  ['commit_island_geometry',{epoch,...outline,canvasWidth:500,canvasHeight:70}],
  ['update_island_region',{epoch,sequence:9999,...outline}],
  ['cancel_island_transition',{epoch:epoch-1}]
 ]) { await call(command,args); result.staleRequests.push({command,rect:probe({op:'snapshot'}).rect}); }
 let rejected=false; try { await call('resize_island_window',{epoch:epoch+1000,width:0,height:34}); } catch { rejected=true; }
 assert(rejected,'Invalid future epoch must be rejected before advancing the guard');
 for(const row of result.staleRequests) assert.deepEqual(row.rect,before.rect);
 const diagnostics=await call('hover_diagnostics',{clear:true});result.staleNative=diagnostics;
 assert.equal(diagnostics.events.filter(e=>e.kind==='set-window-pos-before').length,0);
 result.invalidFutureRejected=true;
 for(const engine of ['gsap','css']) {
  await post({type:'configure',settings:{engine}});await page.waitForTimeout(400);
  const sampling=page.evaluate(()=>new Promise(resolve=>{
   const rows=[];const start=performance.now();
   function tick(){const e=document.querySelector('[data-testid=island]'),r=e.getBoundingClientRect();
    rows.push({t:performance.now()-start,x:r.x,y:r.y,width:r.width,height:r.height,viewport:[innerWidth,innerHeight],phase:e.dataset.motionPhase});
    if(performance.now()-start<2600)requestAnimationFrame(tick);else resolve(rows);
   }requestAnimationFrame(tick);
  }));
  await post({type:'demo',scenario:'critical'});await page.waitForTimeout(100);
  for(const mode of ['compact','expanded','inbox','compact','expanded']) {await post({type:'view',mode});await page.waitForTimeout(60);}
  await expect(pill).toHaveAttribute('data-mode','expanded');await expect(pill).toHaveAttribute('data-motion-phase','settled');
  const rows=await sampling;result.transitions.push({engine,rows});
  for(const r of rows){assert(r.x>=-.1 && r.x+r.width<=r.viewport[0]+.1 && r.height<=r.viewport[1]+.1,'Surface exceeds its HWND viewport');assert.equal(r.y,0);}
  const button=page.getByRole('button',{name:String.fromCodePoint(0x786e,0x8ba4,0x6536,0x5230),exact:true});
  await button.click();await expect(pill).toHaveAttribute('data-mode','success');
  await post({type:'reset'});probe({op:'move',x:40,y:140});await expect(pill).toHaveAttribute('data-mode','compact');await expect(pill).toHaveAttribute('data-motion-phase','settled');
  assert.deepEqual(probe({op:'snapshot'}).rect,before.rect);
 }
 result.pass=true;
} finally {
 await post({type:'reset'});probe({op:'move',x:original[0],y:original[1]});
 await writeFile('evidence/hover-fix-20260930/native-epoch-validation.json',JSON.stringify(result,null,2));await browser.close();
}
