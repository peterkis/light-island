// Dedicated prototype QA endpoint only. Normal launches do not enable CDP.
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
async function post(value) { const r=await fetch('http://127.0.0.1:17321/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});assert(r.ok); }
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('view=island'));
assert(page,'Dedicated island WebView not found');const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={platform:'Windows Tauri Release / WebView2',geometry:[],antialias:[],frames:[],errors};
const pill=page.getByTestId('island');
for (const theme of ['ink','cloud','dusk']) {
 await post({type:'reset'});await post({type:'configure',settings:{theme,engine:'mini',privacy:true,reduced:false,focus:false,top:160}});
 await page.waitForTimeout(650);
 for (const mode of ['compact','expanded']) {
  if(mode==='expanded') await post({type:'demo',scenario:'critical'});
  await pill.waitFor();await page.waitForTimeout(650);
  assert.equal(await pill.getAttribute('data-mode'),mode);
  const bounds=await pill.boundingBox();assert.equal(bounds.height,56);assert.equal(bounds.y,0);
  report.geometry.push({theme,mode,...bounds});
  const file=`evidence/horizontal-native-${theme}-${mode}.png`;
  await page.screenshot({path:file,omitBackground:true,scale:'device'});
  const result=JSON.parse(execFileSync('python',['scripts/probe-horizontal-region.py',file],{encoding:'utf8'}));
  report.antialias.push({theme,mode,...result});
 }
}
await page.getByRole('button',{name:'确认收到',exact:true}).click();
await page.locator('[data-testid=island][data-mode=success]').waitFor();
assert.equal((await pill.boundingBox()).height,56);
const state=await (await fetch('http://127.0.0.1:17321/api/state')).json();assert.equal(state.receipts.length,1);report.receiptRoundtrip=true;
for (const engine of ['mini','css']) {
 await post({type:'configure',settings:{engine}});await page.waitForTimeout(600);
 let i=0;const timer=setInterval(()=>{void post({type:'view',mode:++i%2?'expanded':'compact'});},620);
 try {
  const sample=await page.evaluate(()=>new Promise(resolve=>{
   const frames=[];const sizes=[];const began=performance.now();let previous=began;
   function tick(now){
    frames.push(now-previous);previous=now;const r=document.querySelector('[data-testid=island]').getBoundingClientRect();sizes.push({y:r.y,h:r.height,c:r.x+r.width/2});
    if(now-began<6200){requestAnimationFrame(tick);return;}
    const a=frames.slice(2).sort((x,y)=>x-y);resolve({visible:!document.hidden,frames:a.length,averageFps:1000/(a.reduce((s,n)=>s+n,0)/a.length),p95ms:a[Math.floor(a.length*.95)],over25ms:a.filter(x=>x>25).length,maxHeightDeviation:Math.max(...sizes.map(s=>Math.abs(s.h-56))),maxTopGap:Math.max(...sizes.map(s=>Math.abs(s.y))),centerDrift:Math.max(...sizes.map(s=>s.c))-Math.min(...sizes.map(s=>s.c))});
   }requestAnimationFrame(tick);
  }));
  assert.equal(sample.maxHeightDeviation,0);assert.equal(sample.maxTopGap,0);assert(sample.centerDrift<1);report.frames.push({engine,...sample});
 } finally {clearInterval(timer);}
 await post({type:'view',mode:'compact'});await page.waitForTimeout(600);
}
await post({type:'configure',settings:{theme:'ink',engine:'mini',privacy:true}});await post({type:'reset'});
assert.equal(errors.length,0);
await writeFile('evidence/horizontal-native-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
await browser.close();
