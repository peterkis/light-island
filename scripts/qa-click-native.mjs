// Finite real-input transition probe. Connect only to this application's explicit QA port.
import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const variant=process.argv.includes('--before')?'before':'after';
const dir='evidence/click-fix-20260930';await mkdir(dir,{recursive:true});
const probe=p=>JSON.parse(execFileSync('python',['scripts/hover-win32-probe.py',JSON.stringify(p)],{encoding:'utf8'}));
const original=probe({op:'snapshot'}).cursor;
const click=()=>{const state=probe({op:'snapshot'});assert.equal(state.hitRoot,state.hwnd,'Input cancelled: target is not the dedicated island');return probe({op:'click'});};
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost')&&p.url().includes('view=island'));
assert(page,'Dedicated island WebView missing');
const call=(cmd,args)=>page.evaluate(({cmd,args})=>window.__TAURI_INTERNALS__.invoke(cmd,args),{cmd,args});
const post=async data=>{assert((await fetch('http://127.0.0.1:17321/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)})).ok);};
const island=page.getByTestId('island'),report={variant,time:new Date().toISOString(),cases:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
async function settled(mode){await expect(island).toHaveAttribute('data-mode',mode);await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(120);}
async function realMoveTo(locator){const box=await locator.boundingBox();assert(box);const st=probe({op:'snapshot'}),s=st.dpi/96;return probe({op:'move',x:Math.round(st.rect[0]+(box.x+box.width/2)*s),y:Math.round(st.rect[1]+(box.y+box.height/2)*s),steps:16,delay:.015});}
async function captureAction(name,action){
 await call('hover_diagnostics',{clear:true});
 const first=await page.evaluate(()=>window.__HOVER_TRACE__().at(-1)?.seq??0);
 const sampling=page.evaluate(()=>new Promise(resolve=>{const rows=[],began=performance.now();function tick(){const e=document.querySelector('[data-testid=island]'),r=e.getBoundingClientRect(),content=e.querySelector('.notch-content'),cs=getComputedStyle(content);rows.push({at:performance.timeOrigin+performance.now(),mode:e.dataset.mode,target:e.dataset.targetMode,hover:e.dataset.hovered,epoch:e.dataset.motionEpoch,phase:e.dataset.motionPhase,box:[r.x,r.y,r.width,r.height],viewport:[innerWidth,innerHeight],opacity:+cs.opacity,copy:+cs.getPropertyValue('--copy-alpha'),transform:cs.transform,inert:content.inert});if(performance.now()-began<1800)requestAnimationFrame(tick);else resolve(rows);}requestAnimationFrame(tick);}));
 const input=await action();const rows=await sampling;
 const events=await page.evaluate(first=>window.__HOVER_TRACE__().filter(r=>r.seq>first),first);
 const native=await call('hover_diagnostics',{clear:true});
 const item={name,input,rows,events,native,after:probe({op:'snapshot'})};
 if(variant==='after') {
  assert.equal(native.events.filter(r=>r.kind==='set-window-pos-before').length,0,'Visible interaction must not resize HWND');
  assert.equal(events.filter(e=>e.kind==='motion-start').length,1,'A click must not replay the content transition');
  assert.equal(events.filter(e=>e.kind==='native-error').length,0);
  if(name.endsWith('close')) assert.equal(rows.at(-1).hover,'false','Closed view must not retain its old hover intent');
 }report.cases.push(item);
 console.log(JSON.stringify({name,epochs:events.filter(r=>r.kind==='motion-start').map(r=>({at:r.at,mode:r.mode,key:r.key,hover:r.hover})),moves:native.events.filter(r=>r.kind==='set-window-pos-before').length,final:rows.at(-1)}));
}
try {
 const combos=variant==='before'?[['gsap','notch',false],['css','notch',false]]:[['gsap','notch',false],['css','notch',false],['gsap','capsule',false],['css','capsule',false],['gsap','notch',true],['css','notch',true],['gsap','capsule',true],['css','capsule',true]];
 for(const [engine,shape,reduced] of combos){
  probe({op:'move',x:30,y:150});await post({type:'reset'});await post({type:'configure',settings:{engine,shape,reduced,privacy:true,focus:false,theme:'ink'}});
  await expect(island).toHaveAttribute('data-shape',shape);await settled('compact');
  await realMoveTo(page.locator('.compact-face'));await expect(island).toHaveAttribute('data-hovered','true');await settled('compact');
  await captureAction(`${engine}-${shape}-${reduced}-open`,()=>click());await settled('inbox');
  await realMoveTo(page.locator('.rail-close'));
  await captureAction(`${engine}-${shape}-${reduced}-close`,()=>click());await settled('compact');
  probe({op:'move',x:30,y:150});await page.waitForTimeout(200);
  await post({type:'demo',scenario:'critical'});await settled('expanded');
  await realMoveTo(page.locator('.rail-close'));
  await captureAction(`${engine}-${shape}-${reduced}-critical-close`,()=>click());await settled('compact');
  await page.waitForTimeout(1000);assert.equal(await island.getAttribute('data-mode'),'compact','Close must not auto-reopen peek');
  await page.screenshot({path:`${dir}/${variant}-${engine}-${shape}-${reduced}-compact.png`,omitBackground:true});
 }
}finally{
 await post({type:'reset'});probe({op:'move',x:original[0],y:original[1]});
 await writeFile(`${dir}/${variant}-click-native.json`,JSON.stringify(report,null,2));await browser.close();
}
assert.equal(report.errors.length,0);
