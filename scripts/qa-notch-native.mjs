// Only attach to this prototype's explicitly enabled QA endpoint, never a user browser.
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const base='http://127.0.0.1:17321';
async function post(data){const r=await fetch(base+'/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert(r.ok);}
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('view=island'));
assert(page&&page.url().includes('tauri.localhost'),'Not the dedicated native island');
const island=page.getByTestId('island'),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const report={platform:'Windows / Tauri release / WebView2',geometry:[],frames:[],errors};
async function settled(mode){if(mode)await expect(island).toHaveAttribute('data-mode',mode);await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(60);}
for(const theme of ['ink','cloud','dusk']){
 await post({type:'reset'});await post({type:'configure',settings:{theme,engine:'gsap',shape:'notch',privacy:true,focus:false,reduced:false}});await page.mouse.move(0,75);await settled('compact');
 for(const mode of ['compact','expanded']){
  if(mode==='expanded')await post({type:'demo',scenario:'critical'});
  await settled(mode);const b=await island.boundingBox();assert.equal(b.height,mode==='compact'?34:56);assert.equal(b.y,0);
  const file=`evidence/notch-native-${theme}-${mode}.png`;await page.screenshot({path:file,omitBackground:true,scale:'device'});
  const alpha=JSON.parse(execFileSync('python',['scripts/probe-horizontal-region.py',file],{encoding:'utf8'}));
  report.geometry.push({theme,mode,...b,...alpha});
 }
}
await page.getByRole('button',{name:'确认收到',exact:true}).click();await settled('success');
assert.equal((await(await fetch(base+'/api/state')).json()).receipts.length,1);report.receiptRoundtrip=true;
await post({type:'reset'});await post({type:'configure',settings:{theme:'ink',engine:'gsap',shape:'notch'}});await settled('compact');
await island.hover();await expect.poll(async()=> (await island.boundingBox()).width).toBe(170);await settled('compact');
report.hover={...(await island.boundingBox())};assert.equal(report.hover.height,37);await page.mouse.move(0,75);await expect.poll(async()=> (await island.boundingBox()).width).toBe(160);
await settled('compact');
report.idleMutations=await page.evaluate(()=>new Promise(resolve=>{let count=0;const observer=new MutationObserver(r=>count+=r.length);observer.observe(document.querySelector('[data-testid=island]'),{attributes:true,childList:true,subtree:true});setTimeout(()=>{observer.disconnect();resolve(count);},900);}));assert.equal(report.idleMutations,0);
for(const engine of ['gsap','css']){
 await post({type:'configure',settings:{engine}});await settled('compact');let sequence=0;
 const timer=setInterval(()=>{void post({type:'view',mode:++sequence%2?'expanded':'compact'});},800);
 try{
  const result=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[],sizes=[];const start=performance.now();let previous=start;
   function tick(now){
    frames.push(now-previous);previous=now;const r=document.querySelector('[data-testid=island]').getBoundingClientRect();sizes.push({h:r.height,y:r.y,w:r.width,center:r.x+r.width/2-innerWidth/2});
    if(now-start<8000){requestAnimationFrame(tick);return;}
    const a=frames.slice(2).sort((x,y)=>x-y);resolve({visible:!document.hidden,frames:a.length,averageFps:1000/(a.reduce((s,n)=>s+n,0)/a.length),p95ms:a[Math.floor(a.length*.95)],over25ms:a.filter(x=>x>25).length,minHeight:Math.min(...sizes.map(s=>s.h)),maxHeight:Math.max(...sizes.map(s=>s.h)),maxTopGap:Math.max(...sizes.map(s=>Math.abs(s.y))),maxCenterDeviation:Math.max(...sizes.map(s=>Math.abs(s.center))),maxWidth:Math.max(...sizes.map(s=>s.w))});
   }requestAnimationFrame(tick);
  }));report.frames.push({engine,...result});assert.equal(result.maxTopGap,0);assert(result.maxHeight<=56.1&&result.minHeight>=33.9&&result.maxCenterDeviation<1);
 }finally{clearInterval(timer);}
 await post({type:'view',mode:'compact'});await settled('compact');
}
await post({type:'configure',settings:{engine:'gsap'}});await post({type:'demo',scenario:'critical'});
for(const mode of ['compact','expanded','inbox','compact','expanded']){await post({type:'view',mode});await page.waitForTimeout(40);}
await settled('expanded');await page.getByRole('button',{name:'确认收到',exact:true}).click();await settled('success');report.interruptedReceipt=true;
await post({type:'reset'});await post({type:'configure',settings:{shape:'notch',theme:'ink',engine:'gsap'}});await settled('compact');
assert.equal(errors.length,0);await writeFile('evidence/notch-native-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
await browser.close();
